import { AI_CONFIG } from '../config/aiConfig';

// Mock data for testing without API key
const MOCK_ITINERARY = {
    success: true,
    itinerary: [
        {
            day: 1,
            title: "Arrival & Exploration",
            activities: [
                { time: "10:00 AM", title: "Check-in at Hotel", description: "Settle in and refresh." },
                { time: "12:00 PM", title: "Local Lunch", description: "Try famous local dishes." },
                { time: "02:00 PM", title: "City Walking Tour", description: "Explore the main landmarks." },
                { time: "07:00 PM", title: "Welcome Dinner", description: "Fine dining experience." }
            ]
        },
        {
            day: 2,
            title: "Cultural Dive",
            activities: [
                { time: "09:00 AM", title: "Museum Visit", description: "Learn about local history." },
                { time: "01:00 PM", title: "Traditional Market", description: "Shopping for souvenirs." },
                { time: "04:00 PM", title: "Park Relaxation", description: "Chill at the famous city park." }
            ]
        }
    ],
    expenses: [
        { category: "accommodation", amount: 200, note: "Hotel stay" },
        { category: "food", amount: 150, note: "Meals for 2 days" },
        { category: "transport", amount: 50, note: "Taxi and Metro" },
        { category: "activities", amount: 100, note: "Museum tickets & tours" }
    ]
};

// Helper to call Gemini AI
const callGemini = async (prompt, isJson = true) => {
    const apiKey = AI_CONFIG.geminiKey;
    if (!apiKey) {
        throw new Error('API Key is missing. Please set GEMINI_API_KEY in your .env file.');
    }

    // Using Gemini 2.0 Flash - the current default model
    const fallbackModels = [
        { ver: 'v1beta', name: 'gemini-2.0-flash' },
        { ver: 'v1beta', name: 'gemini-2.0-flash-exp' },
        { ver: 'v1beta', name: 'gemini-2.0-flash-lite' },
    ];

    let lastError = null;

    for (const model of fallbackModels) {
        try {
            const cleanName = model.name.replace(/^models\//, '');
            const url = `https://generativelanguage.googleapis.com/${model.ver}/models/${cleanName}:generateContent?key=${apiKey}`;

            const body = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    ...(isJson ? { responseMimeType: "application/json" } : {})
                }
            };

            console.log(`[AI Attempt] Trying ${cleanName}...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (response.status === 403) {
                const errText = await response.text();
                throw new Error(`API Key Invalid or Leaked: ${errText}`);
            }

            if (!response.ok) {
                const errText = await response.text();
                if (response.status === 404) {
                    console.warn(`[AI] ${cleanName} 404 Not Found`);
                    lastError = new Error(`Model ${cleanName} not found`);
                    continue;
                }
                throw new Error(`API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();

            if (data.promptFeedback && data.promptFeedback.blockReason) {
                throw new Error(`AI Safety Block: ${data.promptFeedback.blockReason}`);
            }

            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No content candidates returned.');
            }

            const firstCandidate = data.candidates[0];
            if (!firstCandidate.content || !firstCandidate.content.parts || !firstCandidate.content.parts[0]) {
                throw new Error('Malformed AI response.');
            }

            let text = firstCandidate.content.parts[0].text;
            if (isJson) {
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(text);
            }
            return text;

        } catch (error) {
            console.error(`[AI Failed] ${model.name}:`, error.message);
            lastError = error;
            if (error.message.includes('API Key')) throw error;
        }
    }

    throw lastError || new Error('All AI models failed.');
};

// Generate trip itinerary
export const generateTripItinerary = async (destination, days, budget, travelers, interests) => {
    if (!AI_CONFIG.geminiKey) {
        console.warn('Using MOCK itinerary data (No API Key)');
        return new Promise(resolve => setTimeout(() => resolve(MOCK_ITINERARY), 2000));
    }

    const prompt = `
    Create a detailed ${days}-day travel itinerary for ${destination} for ${travelers}.
    Budget level: ${budget}.
    Interests: ${interests}.
    
    Return the response in this EXACT JSON structure:
    {
        "success": true,
        "itinerary": [
            {
                "day": 1,
                "title": "Day Theme",
                "activities": [
                    { "time": "10:00 AM", "title": "Check-in", "description": "Details..." },
                    { "time": "02:00 PM", "title": "Activity", "description": "Details..." }
                ]
            }
        ],
        "expenses": [
            { "category": "accommodation", "amount": 0, "note": "Estimate" },
            { "category": "food", "amount": 0, "note": "Estimate" },
            { "category": "transport", "amount": 0, "note": "Estimate" },
            { "category": "activities", "amount": 0, "note": "Estimate" }
        ]
    }
    `;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Error:", error);
        return { success: false, error: error.message };
    }
};

export const generateBudgetPlan = async (answers) => {
    // If no key, return mock data
    if (!AI_CONFIG.geminiKey) {
        console.warn('Using MOCK budget data (No API Key)');
        return {
            success: true,
            feasible: true,
            total: 50000,
            per_person: 12500,
            analysis_message: "MOCK: Budget looks good!",
            realistic_cost: 50000,
            deficit: 0,
            categories: { accommodation: 20000, food: 10000, transport: 10000, activities: 5000, shopping: 2500, other: 2500 },
            tips: ["Book early", "Eat local"]
        };
    }

    const participantsCount = parseInt(answers.travelers) || 1;
    const duration = parseInt(answers.duration) || 3;
    const userMaxBudget = parseInt(answers.budget_max) || 50000;

    const prompt = `
    You are an expert travel budget planner. Analyze and allocate budget for this trip:
    
    TRIP DETAILS:
    - Destination: ${answers.destination}
    - Duration: ${duration} days
    - Travelers: ${participantsCount}
    - User's Maximum Budget: ${userMaxBudget} ${answers.currency || 'INR'}
    - User's Minimum Budget: ${answers.budget_min || userMaxBudget * 0.8} ${answers.currency || 'INR'}
    - Budget Preference: ${answers.preference || 'Mid'}
    - Priority Spending: ${answers.priority || 'Experiences'}
    - Accommodation: ${answers.accommodation || 'Hotel'} (${answers.hotel_price || '2000-5000'}/night)
    - Transport: ${answers.primary_transport || 'Flight'}, Local: ${answers.local_transport || 'Cab'}

    CRITICAL INSTRUCTIONS:
    1. CALCULATE REALISTIC MINIMUM COST properly (Do not hallunicate low numbers):
       - Accommodation: Min ${duration} * ${answers.hotel_price?.split('-')[0] || 2000} (Min 2000/night)
       - Food: Min ${duration} * ${participantsCount} * 1000 (Min 1000/person/day)
       - Transport: Flight/Train cost + Local travel (Min 500/day)
       - Activities: Entry fees/tours (Min 500/day)
       -> SUM these to get "realistic_cost".

    2. Compare "realistic_cost" vs "userMaxBudget" (${userMaxBudget}).
    
    IF realistic_cost > ${userMaxBudget}:
       - YOU MUST SET "feasible": false
       - Set "deficit": (realistic_cost - ${userMaxBudget})
       - Still allocate categories but WITHIN user's max budget of ${userMaxBudget}
       - Message: "Budget is too low. Min realistic cost is ${answers.currency} <realistic_cost>."
    
    IF realistic_cost <= ${userMaxBudget}:
       - Set "feasible": true
       - Set "surplus": (${userMaxBudget} - realistic_cost)
       - Allocate based on realistic cost (not the full max)
       - Message should confirm budget is sufficient.
    
    MATH RULE: Sum of ALL category values MUST EQUAL the "total" field EXACTLY.
    The "total" should NEVER exceed ${userMaxBudget}.
    
    Return ONLY this JSON:
    {
      "success": true,
      "feasible": true or false,
      "total": <number within user's budget>,
      "realistic_cost": <actual estimated cost based on calculation>,
      "deficit": <if feasible=false, how much more is needed>,
      "surplus": <if feasible=true, how much extra budget user has>,
      "per_person": <total / travelers>,
      "analysis_message": "<detailed explanation>",
      "categories": {
        "accommodation": <number>,
        "transport": <number>,
        "food": <number>,
        "activities": <number>,
        "shopping": <number>,
        "other": <number>
      },
      "tips": ["tip1", "tip2"]
    }`;

    try {
        const result = await callGemini(prompt, true);

        // Validate and enforce budget cap
        if (result.total > userMaxBudget) {
            console.warn(`[AI] Total ${result.total} exceeds user max ${userMaxBudget}, capping.`);
            const scale = userMaxBudget / result.total;
            result.categories = Object.fromEntries(
                Object.entries(result.categories).map(([k, v]) => [k, Math.round(v * scale)])
            );
            result.total = userMaxBudget;
        }

        return result;
    } catch (error) {
        console.error("AI Budget Error:", error);
        return { success: false, error: error.message };
    }
};

export const submitAiPlan = async (tripInfo, budgetData) => {
    console.log("Submitting plan:", tripInfo.destination);
    return { success: true };
};

// Generate packing list suggestions
export const generatePackingList = async (destination, travelDate, duration, tripType) => {
    if (!AI_CONFIG.geminiKey) {
        // Return mock data
        return {
            success: true,
            recommendations: [
                { category: 'Essentials', items: ['Passport', 'Wallet', 'Phone', 'Keys'] },
                { category: 'Clothing', items: ['T-Shirts', 'Pants', 'Jacket', 'Underwear'] },
                { category: 'Toiletries', items: ['Toothbrush', 'Shampoo', 'Sunscreen'] },
            ]
        };
    }

    const prompt = `
    Create a packing list for a trip:
    - Destination: ${destination}
    - Travel Date: ${travelDate}
    - Duration: ${duration} days
    - Trip Type: ${tripType}
    
    Consider the weather, local customs, and essential items needed.
    
    Return ONLY this JSON format:
    {
      "success": true,
      "recommendations": [
        { "category": "Essentials", "items": ["item1", "item2", "item3"] },
        { "category": "Clothing", "items": ["item1", "item2", "item3"] },
        { "category": "Toiletries", "items": ["item1", "item2"] },
        { "category": "Electronics", "items": ["item1", "item2"] },
        { "category": "Documents", "items": ["item1", "item2"] },
        { "category": "Health", "items": ["item1", "item2"] }
      ]
    }`;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Packing Error:", error);
        return { success: false, error: error.message };
    }
};

// Generate food recommendations for multiple locations
export const generateFoodRecommendations = async (places, preferences) => {
    const locationList = Array.isArray(places) ? places.join(', ') : places;

    if (!AI_CONFIG.geminiKey) {
        // Return mock data matching expected format
        const mockPlaces = Array.isArray(places) ? places : [places];
        return {
            success: true,
            recommendations: mockPlaces.map(place => ({
                place: place,
                items: [
                    { name: 'Local Specialty', type: 'veg', mustTry: true },
                    { name: 'Street Food', type: 'non-veg', mustTry: true },
                    { name: 'Famous Restaurant Dish', type: 'veg', mustTry: false },
                ]
            }))
        };
    }

    const prompt = `
    Suggest famous food items and must-try dishes for these locations: ${locationList}
    Preferences: ${preferences || 'Both veg and non-veg'}
    
    CRITICAL INSTRUCTIONS:
    1. "place": Must EXACTLY match one of the locations in the list: [${locationList}]. Do not group them.
    2. "type": Must be EXACTLY either "Veg" or "Non-Veg" (Case sensitive, use dashes).
       - If it contains meat/fish/egg -> "Non-Veg"
       - If it is vegetarian -> "Veg"
    
    Return ONLY this JSON format (one entry per location):
    {
      "success": true,
      "recommendations": [
        {
          "place": "Location Name",
          "items": [
            { "name": "Dish Name", "type": "Veg", "mustTry": true },
            { "name": "Dish Name 2", "type": "Non-Veg", "mustTry": false }
          ]
        }
      ]
    }`;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Food Error:", error);
        return { success: false, error: error.message };
    }
};

