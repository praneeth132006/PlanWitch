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

    // List of reliable models to try if discovery isn't used
    const fallbackModels = [
        { ver: 'v1beta', name: 'gemini-1.5-flash' },
        { ver: 'v1beta', name: 'gemini-1.5-pro' },
        { ver: 'v1beta', name: 'gemini-pro' }
    ];

    let lastError = null;

    // Nuclear Fix 2.0: Try to discover available models on both v1 and v1beta
    const versions = ['v1beta', 'v1'];
    for (const ver of versions) {
        try {
            console.log(`[AI Discovery] Attempting to list models on ${ver}...`);
            const listUrl = `https://generativelanguage.googleapis.com/${ver}/models?key=${apiKey}`;
            const listRes = await fetch(listUrl);

            if (listRes.status === 403) {
                const errText = await listRes.text();
                // Critical Error: Key is invalid or blocked
                throw new Error(`API_KEY_ERROR: ${errText.includes('leaked') ? 'API Key reported as leaked' : 'Invalid API Key'}`);
            }

            if (listRes.ok) {
                const listData = await listRes.json();
                // ... (filtering logic remains similar, or we can trust fallback if this fails)
                const models = listData.models || [];
                const chatModel = models.find(m => m.name.includes('gemini-1.5-flash') || m.name.includes('gemini-pro'));

                if (chatModel) {
                    const modelName = chatModel.name.replace(`models/`, '');
                    console.log(`[AI Discovery] Found model: ${modelName} on ${ver}`);
                    fallbackModels.unshift({ ver, name: modelName });
                    break; // Found a working version/model combo
                }
            }
        } catch (e) {
            console.warn(`[AI Discovery] Discovery failed on ${ver}:`, e.message);
            if (e.message.includes('API_KEY_ERROR')) throw e; // Stop immediately if key is bad
        }
    }

    // Try fallbacks
    for (const model of fallbackModels) {
        try {
            const url = `https://generativelanguage.googleapis.com/${model.ver}/models/${model.name}:generateContent?key=${apiKey}`;

            // ... construct body ...
            const body = {
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 2048,
                    ...(isJson ? { responseMimeType: "application/json" } : {})
                }
            };

            console.log(`[AI Attempt] Trying ${model.name} on ${model.ver}...`);
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
                // If 404, just try next model
                if (response.status === 404) {
                    console.warn(`[AI Attempt Failed] ${model.name} 404 Not Found: ${errText}`);
                    lastError = new Error(`Model ${model.name} not found`);
                    continue;
                }
                throw new Error(`API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('No content generated');
            }

            let text = data.candidates[0].content.parts[0].text;
            if (isJson) {
                // Clean markdown
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();
                return JSON.parse(text);
            }
            return text;

        } catch (error) {
            console.error(`[AI Attempt Failed] ${model.name} error:`, error);
            lastError = error;
            if (error.message.includes('API Key')) throw error; // Stop retry loop
        }
    }

    throw lastError || new Error('All AI models failed. Please check your API key.');
};

// Generate trip itinerary
export const generateTripItinerary = async (destination, days, budget, interests = []) => {
    console.log(`[AI Service] Generating real trip for ${destination}`);

    const prompt = `Create a detailed ${days}-day travel itinerary for ${destination} with a budget of ${budget}. 
    Interests: ${interests.join(', ')}.
    Return ONLY a JSON object with this exact structure:
    {
      "success": true,
      "itinerary": [
        {
          "day": 1,
          "title": "Day Title",
          "activities": [
            { "time": "hh:mm AM/PM", "title": "Activity Name", "description": "Brief description" }
          ]
        }
      ],
      "expenses": [
        { "category": "food/transport/accommodation/activities", "amount": 100, "note": "Brief note" }
      ]
    }`;

    try {
        return await callGemini(prompt);
    } catch (error) {
        console.error('[AI Service] Gemini Error:', error);
        return { success: false, error: error.message };
    }
};

// Generate packing list with weather context
export const generatePackingList = async (destination, month, duration, type) => {
    console.log(`[AI Service] Generating real packing list for ${destination} in ${month}`);

    const prompt = `Create a smart packing list for a ${duration}-day ${type} trip to ${destination} in ${month}.
    CRITICAL: You MUST consider the typical weather and climate of ${destination} during ${month} (e.g., if it's monsoon, suggest rain gear; if winter, heavy coats).
    
    Return ONLY a JSON object with this exact structure, categorizing items logically:
    {
      "success": true,
      "recommendations": [
        { "category": "Category Name", "items": ["Item 1 (Context note if needed)", "Item 2"] }
      ]
    }`;

    try {
        return await callGemini(prompt);
    } catch (error) {
        console.error('[AI Service] Packing Gemini Error:', error);
        return { success: false, error: error.message };
    }
};

// Generate food recommendations (Veg/Non-Veg)
export const generateFoodRecommendations = async (destinations) => {
    const placesList = Array.isArray(destinations) ? destinations.join(', ') : destinations;
    console.log(`[AI Service] Generating food recommendations for ${placesList}`);

    const prompt = `Suggest famous local food items for a trip to: ${placesList}.
    For EACH location or the region in general, provide a mix of Vegetarian and Non-Vegetarian famous dishes.
    
    Return ONLY a JSON object with this exact structure:
    {
      "success": true,
      "recommendations": [
        {
            "place": "Place Name", 
            "items": [
                 { "name": "Dish Name", "type": "Veg" | "Non-Veg", "description": "Short yummy description" }
            ]
        }
      ]
    }`;

    try {
        return await callGemini(prompt);
    } catch (error) {
        console.error('[AI Service] Food Gemini Error:', error);
        return { success: false, error: error.message };
    }
};

// Generate Budget Plan based on user questionnaire

export const generateBudgetPlan = async (destination, duration, travelers, answers) => {
    console.log(`[AI Service] Generating budget for ${destination}`);

    const prompt = `Act as a travel budget expert. Create a detailed budget allocation for a trip to ${destination}.
    
    Trip Context:
    - Duration: ${duration} days
    - Travelers: ${travelers}
    - Destination: ${destination}

    User Preferences:
    - Budget Range: ${answers.budget_min} to ${answers.budget_max}
    - Style: ${answers.preference}
    - Priority: ${answers.priority}
    - Accommodation Type: ${answers.accommodation} (Price Range: ${answers.hotel_price})
    - Transport Modes: ${answers.primary_transport}
    - Local Transport: ${answers.local_transport}

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
      "analysis_message": "Insufficient Budget: Your budget of 5k is too low for 5 days in Dubai. You need at least 25k...",
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
        return await callGemini(prompt);
    } catch (error) {
        console.error('[AI Service] Budget Gemini Error:', error);
        return { success: false, error: error.message };
    }
};

// Generate comprehensive personalized plan (Full Itinerary + Packing + Food)
export const generateFullPersonalizedPlan = async (details) => {
    console.log(`[AI Service] Generating Nuclear Plan for ${details.startLocation} to ${details.endLocation}`);

    const prompt = `Act as a premium travel concierge. Create a comprehensive, billionaire-level travel plan based on these details:
    - Start Location: ${details.startLocation}
    - End Location: ${details.endLocation}
    - Stops: ${JSON.stringify(details.stops)}
    - Total Days: ${details.totalDays}
    - Budget: ${details.budget}
    - Dietary Preference: ${details.dietary}
    - Travelers: ${details.travelers} (Ages: ${details.ages})
    - Additional Notes: ${details.additionalNotes}

    Return NO TEXT other than a JSON object with this exact structure:
    {
      "success": true,
      "itinerary": [
        {
          "day": 1,
          "title": "Day Title",
          "activities": [
            { "time": "hh:mm AM/PM", "title": "Activity Name", "description": "Brief description", "cost": "est cost" }
          ]
        }
      ],
      "packingList": [
        { "category": "Clothing/Gear/Health", "items": ["Item name with reason"] }
      ],
      "foodRecommendations": [
        { "name": "Dish/Restaurant Name", "description": "Why they should try it", "isVegFriendly": true }
      ],
      "budgetAnalysis": {
        "summary": "Short breakdown of how to spend the budget",
        "tips": ["Tip 1", "Tip 2"]
      }
    }`;

    try {
        return await callGemini(prompt);
    } catch (error) {
        console.error('[AI Service] Full Plan Error:', error);
        return { success: false, error: error.message };
    }
};

// Chat with assistant
export const chatWithAssistant = async (message, tripContext = {}) => {
    const prompt = `You are RouteMate, a professional travel assistant. 
    Context: Trip to ${tripContext.destination || 'a destination'}.
    User Message: ${message}
    Provide a helpful, concierge-style response. Be specific and friendly.`;

    try {
        return await callGemini(prompt, false);
    } catch (error) {
        console.error('[AI Chat] Error:', error);
        return "I'm having a little trouble connecting to my travel database. Please check your internet or try again in a moment!";
    }
};

// Internal helper for actual fetch execution
const executeGeminiRequest = async (url, prompt, isJson) => {
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096, // Increased for full master plans
        }
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0]?.content?.parts[0]?.text) {
        throw new Error('Malformed AI response');
    }

    const text = data.candidates[0].content.parts[0].text;
    if (isJson) {
        try {
            // Robust JSON extraction: Find the first '{' and last '}'
            const startIdx = text.indexOf('{');
            const endIdx = text.lastIndexOf('}');
            if (startIdx !== -1 && endIdx !== -1) {
                const jsonStr = text.substring(startIdx, endIdx + 1);
                return JSON.parse(jsonStr);
            }
            throw new Error('No JSON brackets found');
        } catch (e) {
            console.error('[AI Parse Error] Failed to parse JSON from text:', text);
            throw new Error(`AI generated text but it wasn't valid JSON. You can try copying the prompt manually.`);
        }
    }
    return text;
};
