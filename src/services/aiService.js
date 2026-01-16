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

// Helper to call Gemini AI with automated model discovery
const callGemini = async (prompt, isJson = true) => {
    const apiKey = AI_CONFIG.geminiKey;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error('API Key is missing in src/config/aiConfig.js');
    }

    // Using Gemini 2.0 Flash - the current default model as of Jan 2025
    const fallbackModels = [
        { ver: 'v1beta', name: 'gemini-2.0-flash' },          // CURRENT DEFAULT
        { ver: 'v1beta', name: 'gemini-2.0-flash-exp' },      // Experimental
        { ver: 'v1beta', name: 'gemini-2.0-flash-lite' },     // Lite version
    ];

    let lastError = null;

    // Direct execution loop - No discovery, just try the trusted models
    for (const model of fallbackModels) {
        try {
            // Ensure no double models/ prefix
            const cleanName = model.name.replace(/^models\//, '');
            const url = `https://generativelanguage.googleapis.com/${model.ver}/models/${cleanName}:generateContent?key=${apiKey}`;

            // ... construct body ...
            const body = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    ...(isJson ? { responseMimeType: "application/json" } : {})
                }
            };

            console.log(`[AI Attempt] Trying ${cleanName} on ${model.ver}...`);
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
                    console.warn(`[AI Attempt Failed] ${cleanName} 404 Not Found: ${errText}`);
                    lastError = new Error(`Model ${cleanName} not found`);
                    continue;
                }
                throw new Error(`API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();

            // Safety Check
            if (data.promptFeedback && data.promptFeedback.blockReason) {
                console.warn(`[AI Safety Block] ${cleanName}:`, data.promptFeedback);
                throw new Error(`AI Safety Block: ${data.promptFeedback.blockReason}`);
            }

            if (!data.candidates || data.candidates.length === 0) {
                console.error(`[AI Empty Response] ${cleanName}:`, JSON.stringify(data));
                throw new Error('No content candidates returned. The AI might be overloaded or blocked.');
            }

            // Check for valid parts
            const firstCandidate = data.candidates[0];
            if (!firstCandidate.content || !firstCandidate.content.parts || !firstCandidate.content.parts[0]) {
                console.error(`[AI Malformed Response] ${cleanName}:`, JSON.stringify(data));
                throw new Error('Malformed AI response.');
            }

            let text = firstCandidate.content.parts[0].text;
            if (isJson) {
                // Clean markdown
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(text);
            }
            return text;

        } catch (error) {
            console.error(`[AI Attempt Failed] ${model.name} error:`, error.message);
            lastError = error;
            if (error.message.includes('API Key')) throw error; // Stop retry loop
        }
    }

    throw lastError || new Error('All AI models failed. Please check your API key.');
};

// Generate trip itinerary
export const generateTripItinerary = async (destination, days, budget, travelers, interests) => {
    // If no key, return mock data
    if (!AI_CONFIG.geminiKey || AI_CONFIG.geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
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
    if (!AI_CONFIG.geminiKey || AI_CONFIG.geminiKey === 'YOUR_GEMINI_API_KEY_HERE') {
        console.warn('Using MOCK budget data (No API Key)');
        return {
            success: true,
            feasible: true,
            total: 50000,
            per_person: 12500,
            analysis_message: "MOCK: Budget looks good!",
            categories: { accommodation: 20000, food: 10000, transport: 10000, activities: 5000, shopping: 2500, other: 2500 },
            tips: ["Book early", "Eat local"]
        };
    }

    const participantsCount = parseInt(answers.travelers) || 1;
    const duration = parseInt(answers.duration) || 3;

    const prompt = `
    Act as an expert travel budget planner.
    Create a strict and realistic budget allocation for a trip to:
    - Destination: ${answers.destination}
    - Duration: ${duration} days
    - Travelers: ${participantsCount}
    - Total Budget Limit: ${answers.budget_max} ${answers.currency || 'INR'}
    - Budget Preference: ${answers.preference || 'Mid'}
    - Priority Spending: ${answers.priority || 'Experiences'}
    - Accommodation Type: ${answers.accommodation || 'Hotel'}
    - Hotel Price Range: ${answers.hotel_price || '2000 - 5000'}
    - Primary Transport: ${answers.primary_transport || 'Flight'}
    - Local Transport: ${answers.local_transport || 'Cab'}

    CRITICAL RULES:
    1. Calculate the Realistic Total Cost (RTC) for this specific trip configuration (Destination + Duration + Travelers).
    2. STRICTLY Compare RTC with the user's Max Budget (${answers.budget_max}).
    3. FEASIBILITY CHECK:
       - If RTC > ${answers.budget_max}: Set "feasible": false. The "total" MUST be the RTC (the actual needed amount). Message MUST start with "Insufficient Budget:" and explain the deficit.
       - If RTC <= ${answers.budget_max}: Set "feasible": true. The "total" should be the RTC. Message should confirm sufficiency.
    4. MATH CHECK: The Sum of "categories" values MUST equal the "total" field EXACTLY.
    
    Return ONLY a JSON object with this exact structure:
    {
      "success": true,
      "feasible": true,
      "total": 80000,
      "per_person": 20000,
      "analysis_message": "Your budget analysis here...",
      "categories": {
        "accommodation": 30000,
        "transport": 20000,
        "food": 15000,
        "activities": 10000,
        "shopping": 2500,
        "other": 2500
      },
      "tips": ["Tip 1", "Tip 2"]
    }`;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Budget Error:", error);
        return { success: false, error: error.message };
    }
};

export const submitAiPlan = async (tripInfo, budgetData) => {
    // This function can be used to refine the plan if needed
    console.log("Submitting plan:", tripInfo.destination);
    return { success: true };
};
