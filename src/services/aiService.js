import { AI_CONFIG } from '../config/aiConfig';
import { getNearbyPlaces, getDistanceMatrixBatch, getMacroDistanceMatrix } from './transitService';

// Mock data for testing without API key
const MOCK_ITINERARY = {
    success: true,
    itinerary: [
        {
            day: 1,
            title: "Arrival & Exploration",
            activities: [
                { time: "10:00 AM", title: "Check-in at Hotel", description: "Settle in and refresh.", type: "hotel", duration: "1 hour", location: "Hotel", cost: 0 },
                { time: "12:00 PM", title: "Local Lunch", description: "Try famous local dishes.", type: "lunch", duration: "1 hour", location: "Local Restaurant", cost: 500 },
                { time: "02:00 PM", title: "City Walking Tour", description: "Explore the main landmarks.", type: "tour", duration: "3 hours", location: "City Center", cost: 800 },
                { time: "07:00 PM", title: "Welcome Dinner", description: "Fine dining experience.", type: "dinner", duration: "1.5 hours", location: "Fine Dining Restaurant", cost: 1500 }
            ]
        },
        {
            day: 2,
            title: "Cultural Dive",
            activities: [
                { time: "09:00 AM", title: "Museum Visit", description: "Learn about local history.", type: "museum", duration: "2 hours", location: "City Museum", cost: 300 },
                { time: "01:00 PM", title: "Traditional Market", description: "Shopping for souvenirs.", type: "shopping", duration: "2 hours", location: "Old Bazaar", cost: 1000 },
                { time: "04:00 PM", title: "Park Relaxation", description: "Chill at the famous city park.", type: "nature", duration: "1.5 hours", location: "Central Park", cost: 0 }
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

    // Using Gemini 2.0 Flash with high token capacity for premium output
    // Using Gemini 2.5 Flash as primary, with 2.0 Flash Lite as fallback
    // Updated model names to match current Google AI API availability
    // The lines below update the fallback models array to use the currently active and supported Google AI models ('gemini-2.5-flash' and 'gemini-2.0-flash-lite'). This resolves the '404 Not Found' errors that occurred when trying to reach older endpoints.
    const fallbackModels = [
        { ver: 'v1beta', name: 'gemini-2.5-flash' },
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
                    ...(isJson ? { responseMimeType: "application/json" } : {})
                }
            };

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
            
            if (!text || text.trim() === '') {
                throw new Error('AI returned an empty response.');
            }

            if (isJson) {
                // Clean up common AI formatting issues
                text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

                // If text somehow doesn't start with { or [, strip leading junk
                const firstBrace = text.indexOf('{');
                const firstBracket = text.indexOf('[');
                const firstChar = (firstBrace !== -1 && firstBracket !== -1) ? Math.min(firstBrace, firstBracket) : Math.max(firstBrace, firstBracket);
                if (firstChar > 0) {
                    text = text.substring(firstChar);
                }

                // If text doesn't end with } or ], strip trailing junk
                const lastBrace = text.lastIndexOf('}');
                const lastBracket = text.lastIndexOf(']');
                const lastChar = Math.max(lastBrace, lastBracket);
                if (lastChar !== -1 && lastChar < text.length - 1) {
                    text = text.substring(0, lastChar + 1);
                }

                // Try to parse, with fallback handling for truncated responses
                try {
                    return JSON.parse(text);
                } catch (parseError) {
                    console.warn('[AI] JSON parse failed, raw length:', text.length, 'attempting recovery...');

                    // Attempt to fix truncated JSON by closing brackets
                    let fixedText = text;

                    // Count open/close brackets
                    const openBraces = (fixedText.match(/{/g) || []).length;
                    const closeBraces = (fixedText.match(/}/g) || []).length;
                    const openBrackets = (fixedText.match(/\[/g) || []).length;
                    const closeBrackets = (fixedText.match(/\]/g) || []).length;

                    // Add missing closing brackets
                    for (let i = 0; i < openBrackets - closeBrackets; i++) fixedText += ']';
                    for (let i = 0; i < openBraces - closeBraces; i++) fixedText += '}';

                    try {
                        return JSON.parse(fixedText);
                    } catch (e) {
                        throw new Error(`JSON parse failed: ${parseError.message}`);
                    }
                }
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

// ═══════════════════════════════════════════════════════════════
// 1. PREMIUM ITINERARY GENERATION
// ═══════════════════════════════════════════════════════════════
// Helper to rigidly enforce travel items between activities (Fallback for AI memory lapses)
const addMissingTravelItems = (itinerary) => {
    if (!itinerary || !Array.isArray(itinerary)) return itinerary;

    return itinerary.map(day => {
        if (!day.activities || !Array.isArray(day.activities)) return day;

        let newActivities = [];
        for (let i = 0; i < day.activities.length; i++) {
            const currentAct = day.activities[i];
            newActivities.push(currentAct);

            // If this is not the last activity, check if a travel item follows
            if (i < day.activities.length - 1) {
                const nextAct = day.activities[i + 1];

                // If neither current nor next is a travel step ('car', 'flight', 'train', 'bus'), inject a default one
                const isTravel = (type) => ['car', 'flight', 'train', 'bus'].includes(type?.toLowerCase());

                if (!isTravel(currentAct.type) && !isTravel(nextAct.type)) {
                    // Try to guess start time based on current activity's end time if possible (basic string manipulation usually fails, so keep it simple)
                    newActivities.push({
                        time: nextAct.time ? nextAct.time.replace(/([0-9]+):([0-9]+)\s*(AM|PM)/i, (m, h, min, a) => {
                            let hh = parseInt(h); let mm = parseInt(min) - 20;
                            if (mm < 0) { mm += 60; hh -= 1; if (hh === 0) hh = 12; }
                            return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')} ${a}`;
                        }) : '--:--',
                        title: `Travel to ${nextAct.location ? nextAct.location.split(',')[0] : 'Next Stop'}`,
                        type: 'car',
                        duration: '20 mins',
                        description: 'Transit (Auto-calculated fallback)',
                        location: 'En route',
                        cost: 0
                    });
                }
            }
        }
        return { ...day, activities: newActivities };
    });
};

export const generateTripItinerary = async (destination, days, budget, travelers, interests, preferences = {}) => {
    if (!AI_CONFIG.geminiKey) {
        console.warn('Using MOCK itinerary data (No API Key)');
        return new Promise(resolve => setTimeout(() => resolve(MOCK_ITINERARY), 2000));
    }

    const {
        pace = 'Moderate',
        startTime = '09:00 AM',
        endTime = '09:00 PM',
        locationDurations = {},
        startLocation = '',
        transitModes = [],
        routeOptimization = 'optimize',
        placesAndDurationEnabled = true
    } = preferences;

    let locationContext = 'Distribute days logically across the destination based on best travel routes.';
    if (placesAndDurationEnabled && Object.keys(locationDurations).length > 0) {
        locationContext = Object.entries(locationDurations)
            .map(([loc, days]) => `- ${loc}: ${days} days`)
            .join('\n');
    }

    const hasTimings = startTime && endTime;

    const transitContext = transitModes.length > 0 ? `Preferred inter-city transit: ${transitModes.join(', ')}.` : '';
    const routeContext = routeOptimization === 'follow-order' ? 'Follow the exact order of locations provided.' : 'Optimize the route order to minimize travel time between locations.';
    const originContext = startLocation ? `Trip starts from exactly: ${startLocation}. Include initial travel from here.` : '';

    const prompt = `You are a WORLD-CLASS LUXURY CONCIERGE TRAVEL PLANNER with 20+ years of experience curating premium travel experiences globally.

Your knowledge is built from deep expertise across top travel platforms:
• ATTRACTIONS: TripAdvisor, Viator, GetYourGuide, Atlas Obscura, Lonely Planet, Culture Trip, National Geographic Travel, Rough Guides
• MAPS & LOGISTICS: Google Maps, OpenStreetMap — for accurate distances, travel times, and route optimization
• WEATHER: AccuWeather, BBC Weather — for seasonal & climate awareness
• LOCAL INSIGHTS: Culture Trip, Atlas Obscura — for hidden gems and off-the-beaten-path experiences

═══════════════════════════════════════
TRIP BRIEF
═══════════════════════════════════════
• Destination: ${destination}
• Duration: ${days} days
• Budget Level: ${budget}
• Travelers: ${travelers}
• Interests: ${interests || 'General sightseeing'}
• Pace: ${pace}
${hasTimings ? `• Daily Window: ${startTime} to ${endTime}` : '• Daily Window: CHOOSE OPTIMAL TIMES (e.g., start earlier for sunrise/nature, end late for nightlife)'}
${originContext ? `• Origin: ${originContext}\n` : ''}${transitContext ? `• Transit Preference: ${transitContext}\n` : ''}${routeContext ? `• Routing: ${routeContext}` : ''}

Per-Location Day Allocation:
${locationContext}

═══════════════════════════════════════
PLANNING RULES (MANDATORY)
═══════════════════════════════════════

1. STRICT GEOGRAPHIC BOUNDS (NO HALLUCINATIONS)
   - You MUST ONLY suggest places physically located IN OR VERY NEAR the requested destinations (${destination}).
   - DO NOT suggest places in other states/cities just because they share a name (e.g., if asked for Gokarna, DO NOT suggest Mahabaleshwar in Maharashtra; use Mahabaleshwar Temple in Gokarna).
   - Verify the exact state/region of EVERY place you suggest before adding it.

2. TRAVEL AS SEPARATE ITEMS (MOST IMPORTANT RULE)
   - Between EVERY two consecutive activities, you MUST insert a TRAVEL item.
   - The travel item MUST have type "car" and include the estimated distance (in km) and travel time.
   - The travel item's "time" = when the previous activity ends (previous time + previous duration).
   - The next activity's "time" = travel item's "time" + travel item's "duration".
   - Example sequence:
     Activity A at 09:00 AM (1 hour) → Travel at 10:00 AM (20 mins, 4km) → Activity B at 10:20 AM (2 hours)
   - This is MANDATORY. An itinerary without travel items between activities is INVALID.

2. TIME PLANNING & OPERATING HOURS (CRITICAL)
   - You MUST verify the real-world opening/closing times of all attractions (e.g. National Parks, Temples, Museums) before scheduling. DO NOT schedule visits when a place is closed (e.g., National Parks closing by 4 PM).
   - DO NOT default to starting every day at 9:00 AM. Choose the optimal start and end time based on the activities planned (e.g., 6:00 AM for wildlife safaris or sunrise, 10:00 AM for relaxed days).
   - Events in STRICT CHRONOLOGICAL order. No overlaps.
   - Realistic durations: 1.5-2 hrs for major attractions, 45 min-1 hr for meals, 30 min for quick stops.

3. SMART ACTIVITY SELECTION
   - Select based on: traveler interests, weather, crowd patterns, location proximity
   - PRIORITIZE: Must-see landmarks > Hidden gems > Cultural immersion > Nature
   - Include at least 1 "hidden gem" per day
   - Group nearby attractions together to minimize travel

4. FOOD INTEGRATION
   - Include breakfast, lunch, and dinner with specific restaurant names
   - Recommend REAL restaurants — not generic "Local Restaurant"
   - Mention the signature dish to try

5. PRACTICAL DETAILS
   - "cost": Estimated cost per person in local currency
   - "duration": Realistic time for the activity
   - "description": Why this is special + pro tips
   - "location": Specific place name, not just city name

═══════════════════════════════════════
ACTIVITY TYPES (use these exact strings)
═══════════════════════════════════════
Must be one of: 'flight', 'train', 'bus', 'car', 'hotel', 'checkin', 'checkout', 'breakfast', 'lunch', 'dinner', 'cafe', 'attraction', 'tour', 'shopping', 'nature', 'beach', 'museum', 'nightlife'

USE 'car' FOR ALL TRAVEL/TRANSIT ITEMS between activities.

═══════════════════════════════════════
OUTPUT FORMAT (Return ONLY this JSON)
═══════════════════════════════════════
{
  "success": true,
  "itinerary": [
    {
      "day": 1,
      "title": "Descriptive Day Theme",
      "activities": [
        {
          "time": "08:00 AM",
          "title": "Breakfast at Prema Restaurant",
          "type": "breakfast",
          "duration": "45 minutes",
          "description": "Famous South Indian breakfast spot. Try the Masala Dosa.",
          "location": "Prema Restaurant, Gokarna Main Road",
          "cost": 150
        },
        {
          "time": "08:45 AM",
          "title": "Travel to Om Beach",
          "type": "car",
          "duration": "20 minutes",
          "description": "4.5 km by auto-rickshaw via Om Beach Road",
          "location": "En route",
          "cost": 100
        },
        {
          "time": "09:05 AM",
          "title": "Explore Om Beach",
          "type": "beach",
          "duration": "2 hours",
          "description": "Relax on the famous Om-shaped beach. Try water sports.",
          "location": "Om Beach, Gokarna",
          "cost": 0
        },
        {
          "time": "11:05 AM",
          "title": "Travel to Half Moon Beach",
          "type": "car",
          "duration": "30 minutes",
          "description": "2 km trek along the coastal trail from Om Beach",
          "location": "En route",
          "cost": 0
        },
        {
          "time": "11:35 AM",
          "title": "Half Moon Beach Visit",
          "type": "beach",
          "duration": "1.5 hours",
          "description": "Secluded beach accessible by trek. Pack water.",
          "location": "Half Moon Beach, Gokarna",
          "cost": 0
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON. No markdown, no code blocks, no explanations outside the JSON.`;

    try {
        const rawResult = await callGemini(prompt, true);
        if (rawResult && rawResult.success && rawResult.itinerary) {
            rawResult.itinerary = addMissingTravelItems(rawResult.itinerary);
        }
        return rawResult;
    } catch (error) {
        console.error("AI Error:", error);
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// 2. PREMIUM BUDGET PLAN
// ═══════════════════════════════════════════════════════════════
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

    const prompt = `You are an EXPERT TRAVEL BUDGET ANALYST with deep knowledge of global travel costs.

Your pricing intelligence is built from these authoritative sources:
• COST DATA: Numbeo (cost of living), BudgetYourTrip (average travel expenses), Expatistan (city cost comparisons)
• FLIGHTS: Skyscanner, Google Flights, Kayak, Momondo — for realistic flight/train cost estimates
• STAYS: Booking.com, Airbnb, Agoda, Hotels.com, Trip.com — for accommodation pricing by category
• TRANSPORT: Google Maps, local transport authority data — for local travel cost estimates
• ACTIVITIES: TripAdvisor, Viator, GetYourGuide — for entry fees and tour costs

═══════════════════════════════════════
TRIP BUDGET BRIEF
═══════════════════════════════════════
• Destination: ${answers.destination}
• Duration: ${duration} days
• Travelers: ${participantsCount}
• User's Max Budget: ${answers.budget_max ? answers.budget_max + ' ' + (answers.currency || 'INR') : 'NOT SPECIFIED (Calculate recommended)'}
• User's Min Budget: ${answers.budget_min ? answers.budget_min + ' ' + (answers.currency || 'INR') : 'NOT SPECIFIED'}
• Budget Preference: ${answers.preference || 'Mid'}
• Priority Spending: ${answers.priority || 'Experiences'}
• Accommodation: ${answers.accommodation || 'Hotel'} (${answers.hotel_price || '2000-5000'}/night)
• Inter-city Transport: ${answers.primary_transport || 'Flight'}
• Local Transport: ${answers.local_transport || 'Cab'}

═══════════════════════════════════════
BUDGET CALCULATION RULES (MANDATORY)
═══════════════════════════════════════

1. CALCULATE REALISTIC MINIMUM COST (Do NOT hallucinate low numbers):
   - Accommodation: ${duration} nights × realistic nightly rate for "${answers.accommodation || 'Hotel'}" in ${answers.destination} at "${answers.hotel_price || '2000-5000'}" price range
   - Food: ${duration} days × ${participantsCount} persons × realistic daily food cost (breakfast + lunch + dinner + snacks)
   - Inter-city Transport: Realistic cost for ${answers.primary_transport || 'Flight'} to/from ${answers.destination} × ${participantsCount} persons
   - Local Transport: ${duration} days × realistic daily local travel cost (${answers.local_transport || 'Cab'})
   - Activities: ${duration} days × realistic daily activity/entrance fee cost
   - Shopping & Other: Reasonable allocation based on destination

2. FEASIBILITY CHECK:
   IF realistic_cost > ${userMaxBudget}:
   → Set "feasible": false
   → Set "deficit": (realistic_cost - ${userMaxBudget})
   → Still allocate categories WITHIN user's max budget of ${userMaxBudget}
   → Message: Explain what's too expensive and how to make it work

   IF realistic_cost <= ${userMaxBudget}:
   → Set "feasible": true
   → Set "surplus": (${userMaxBudget} - realistic_cost)
   → Allocate based on realistic cost
   → Message: Confirm budget is sufficient, suggest how to use surplus

3. MATH RULES:
   - Sum of ALL category values MUST EQUAL the "total" field EXACTLY
   - "total" should NEVER exceed ${userMaxBudget}
   - "per_person" = total / ${participantsCount}

4. SMART TIPS:
   - Provide 5-7 actionable, SPECIFIC cost-saving tips for ${answers.destination}
   - Include tips like: best time to book, cheaper transport alternatives, free activities, local food vs tourist restaurants
   - Include at least 1 "splurge-worthy" tip where spending more is genuinely worth it

═══════════════════════════════════════
OUTPUT FORMAT (Return ONLY this JSON)
═══════════════════════════════════════
{
    "success": true,
    "feasible": true,
    "total": <number within user's budget>,
    "realistic_cost": <actual estimated cost>,
    "deficit": <if feasible=false>,
    "surplus": <if feasible=true>,
    "per_person": <total / travelers>,
    "analysis_message": "<detailed 2-3 sentence analysis explaining the budget breakdown and key insights>",
    "categories": {
        "accommodation": <number>,
        "transport": <number>,
        "food": <number>,
        "activities": <number>,
        "shopping": <number>,
        "other": <number>
    },
    "tips": ["Specific tip 1", "Specific tip 2", "Specific tip 3", "Specific tip 4", "Specific tip 5"]
}

IMPORTANT: Return ONLY the JSON. No markdown, no code blocks.`;

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
    return { success: true };
};

// ═══════════════════════════════════════════════════════════════
// 3. PREMIUM PACKING LIST
// ═══════════════════════════════════════════════════════════════
export const generatePackingList = async (destination, travelDate, duration, tripType) => {
    if (!AI_CONFIG.geminiKey) {
        return {
            success: true,
            recommendations: [
                { category: 'Essentials', items: ['Passport', 'Wallet', 'Phone', 'Keys'] },
                { category: 'Clothing', items: ['T-Shirts', 'Pants', 'Jacket', 'Underwear'] },
                { category: 'Toiletries', items: ['Toothbrush', 'Shampoo', 'Sunscreen'] },
            ]
        };
    }

    const prompt = `You are a METICULOUS TRAVEL PACKING SPECIALIST who has helped thousands of travelers pack perfectly.

Your climate and destination knowledge comes from:
• WEATHER: AccuWeather, BBC Weather, Weather.com — for precise seasonal weather data
• DESTINATION: Lonely Planet, Culture Trip, TripAdvisor — for activity-specific and cultural packing needs
• GEOGRAPHY: Knowledge of terrain, altitude, and local conditions at ${destination}

═══════════════════════════════════════
PACKING BRIEF
═══════════════════════════════════════
• Destination: ${destination}
• Travel Date: ${travelDate}
• Duration: ${duration} days
• Trip Type: ${tripType}

═══════════════════════════════════════
PACKING RULES (MANDATORY)
═══════════════════════════════════════

1. CLIMATE-FIRST APPROACH:
   - Research the EXPECTED WEATHER at ${destination} during ${travelDate}
   - If hot & humid → lightweight, breathable fabrics, sun protection
   - If cold → layering system, thermal wear, warm accessories
   - If rainy season → waterproof gear, quick-dry clothing
   - If variable → versatile pieces that work across conditions

3. PREMIUM SELECTION (MANDATORY):
   - Focus on HIGH-VALUE, SPECIALIZED, or CONTEXT-AWARE items.
   - EXCLUDE: Basic soap, generic towels, toothbrush, basic toothpaste, or tissues.
   - INCLUDE: Tech gear (converters, e-sim), high-end skin protection, destination-specific clothing, and premium comfort items.

4. BE HYPER-SPECIFIC (MANDATORY):
   - Every item MUST include a specific detail about its material, brand-type, or function.
   ✅ "Light waterproof windbreaker for coastal winds" instead of ❌ "Jacket"
   ✅ "Breathable mesh walking shoes for city tours" instead of ❌ "Shoes"
   ✅ "Universal travel adapter (Type C/G/I) with USB-C" instead of ❌ "Adapter"
   ✅ "2x Quick-dry UV-protection hiking shorts" instead of ❌ "2x Shorts"

5. LUGGAGE STRATEGY:
   - For each item, decide if it belongs in "carry" or "checked".
   - Documents, electronics, and medicine MUST be "carry".
   - Bulk clothing and large liquids MUST be "checked".

6. QUANTITIES & ACTIVITY GROUPING:
   - Include quantities (e.g. "3x casual shirts").
   - Categorize items by activity if possible (e.g. "Temple Visit", "Hiking", "Fine Dining").

7. STRICT LIMIT: Maximum 25-30 HIGH-IMPACT items. Quality over quantity.

═══════════════════════════════════════
OUTPUT FORMAT (Return ONLY this JSON)
═══════════════════════════════════════
{
    "success": true,
    "recommendations": [
        {
          "category": "Essentials", 
          "items": [
            { "name": "Specific Item Name", "qty": 1, "luggage": "carry", "notes": "Specific reason or tip" }
          ]
        }
    ]
}

IMPORTANT: The "luggage" field must be "carry" or "checked". Return ONLY the JSON.`;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Packing Error:", error);
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// 4. PREMIUM FOOD RECOMMENDATIONS
// ═══════════════════════════════════════════════════════════════
export const generateFoodRecommendations = async (places, preferences) => {
    const locationList = Array.isArray(places) ? places.join(', ') : places;

    if (!AI_CONFIG.geminiKey) {
        const mockPlaces = Array.isArray(places) ? places : [places];
        return {
            success: true,
            recommendations: mockPlaces.map(place => ({
                place: place,
                items: [
                    { name: 'Local Specialty', type: 'Veg', mustTry: true, bestTime: 'Morning', bestLocation: 'Local Market' },
                    { name: 'Street Food', type: 'Non-Veg', mustTry: true, bestTime: 'Night', bestLocation: 'Main Street' },
                    { name: 'Famous Restaurant Dish', type: 'Veg', mustTry: false, bestTime: 'Evening', bestLocation: 'Iconic Plaza' },
                ]
            }))
        };
    }

    const prompt = `You are a world-class culinary travel concierge. For locations: [${locationList}], suggest 12-15 iconic, must-try dishes and local food specialties.
    
    For each dish, provide deep, curated "insider" details.

    JSON SCHEMA:
    {
        "success": true,
        "recommendations": [
            {
                "place": "MATCH EXACTLY FROM LIST",
                "items": [
                    {
                        "name": "Dish Name (e.g. Pad Thai)",
                        "bestLocations": ["Specific restaurant/spot 1", "Spot 2"],
                        "bestTime": "EXACTLY one of: [Morning, Afternoon, Evening, Night, Late Night]",
                        "type": "Veg OR Non-Veg",
                        "mustTry": true/false,
                        "localSecret": "A short (10-15 words) pro-tip or insider secret about how to eat this like a local.",
                        "perfectPairing": "Return ONE authentic traditional drink or side dish that TRULY enhances this meal. If no globally recognized authentic pairing exists, return null. DO NOT suggest generic or forced combinations.",
                        "vibe": "One short tag (2-3 words) describing the experience (e.g. 'Sunset View', 'Historic/Rustic', 'Busy Street Vibe')",
                        "priceRange": "Return exactly one of: [₹, ₹₹, ₹₹₹]",
                        "variation": "One specific 'special' or 'premium' version/topping of this dish to ask for."
                    }
                ]
            }
        ]
    }

    Rules:
    - Recommendations must be culturally significant.
    - perfectPairing MUST be geographically and traditionally accurate (e.g. 'Sol Kadhi' with Malvani food).
    - Preferences: ${preferences || 'Both Veg and Non-Veg'}
    Return ONLY JSON. No markdown.`;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Food Error:", error);
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// 5. DESTINATION INFO
// ═══════════════════════════════════════════════════════════════
export const generateDestinationInfo = async (destination) => {
    if (!AI_CONFIG.geminiKey) {
        return {
            success: true,
            info: `Get ready for an unforgettable journey to ${destination}. You're all set to explore amazing places and make memories that last a lifetime!`
        };
    }

    const prompt = `You are a creative travel copywriter.
    Write a vibrant, exciting, and evocative description for a trip to ${destination}.
    MAX 15 WORDS. Make it feel premium and aspirational.
    Focus on the unique vibe, culture, and energy of the destination.

    Return ONLY this JSON:
    {
        "success": true,
        "info": "Your description here."
    }`;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Destination Info Error:", error);
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// 6. PREMIUM TRIP SUGGESTIONS
// ═══════════════════════════════════════════════════════════════
export const generateTripSuggestions = async (destination, duration, travelers, interests) => {
    if (!AI_CONFIG.geminiKey) {
        return {
            success: true,
            suggestions: [
                { title: "Local Cuisine Tour", desc: "Try the best street food in town.", icon: "restaurant" },
                { title: "Hidden Photography Spots", desc: "Capture unique angles of the city.", icon: "camera" },
                { title: "Cultural Workshop", desc: "Learn pottery or traditional arts.", icon: "palette" }
            ]
        };
    }

    const prompt = `You are a PREMIUM TRAVEL CONCIERGE with deep local knowledge.

Your insights are drawn from: Atlas Obscura (hidden gems), Lonely Planet (curated guides), Culture Trip (cultural experiences), National Geographic Travel (unique adventures), Rough Guides, and local expert networks.

═══════════════════════════════════════
TRIP CONTEXT
═══════════════════════════════════════
• Destination: ${destination}
• Duration: ${duration} days
• Travelers: ${travelers}
• Interests: ${interests || 'General exploration'}

═══════════════════════════════════════
SUGGESTION RULES
═══════════════════════════════════════

1. Suggest exactly 3 UNIQUE, SPECIFIC, and genuinely exciting things that most travelers miss
2. These should NOT be generic tourist advice — they should feel like insider tips from a local friend
3. Each should be actionable and specific to ${destination}
4. Priority: hidden gems > unique local experiences > seasonal events > unusual activities
5. "icon" MUST be a valid Material Icon name (e.g., hiking, restaurant, camera, palette, music_note, local_bar, beach_access, temple_hindu, mosque, church, castle, festival, etc.)

Return ONLY this JSON:
{
    "success": true,
    "suggestions": [
        { "title": "Catchy Specific Title", "desc": "Short exciting description (max 12 words).", "icon": "valid_material_icon" },
        { "title": "Catchy Specific Title", "desc": "Short exciting description.", "icon": "valid_material_icon" },
        { "title": "Catchy Specific Title", "desc": "Short exciting description.", "icon": "valid_material_icon" }
    ]
}

IMPORTANT: Return ONLY the JSON. No markdown, no code blocks.`;

    try {
        return await callGemini(prompt, true);
    } catch (error) {
        console.error("AI Suggestions Error:", error);
        return { success: false, error: error.message };
    }
};

// ═══════════════════════════════════════════════════════════════
// 7. CONVERSATIONAL ASSISTANT (Chat Widget)
// ═══════════════════════════════════════════════════════════════
export const chatWithAssistant = async (message, history = [], tripInfo = {}) => {
    if (!AI_CONFIG.geminiKey) {
        return `MOCK: I'd love to help with "${message}", but no Gemini API key is configured yet.`;
    }

    const tripContext = tripInfo?.destination
        ? `The user currently has an active trip to ${tripInfo.destination}${tripInfo.startDate ? ` from ${tripInfo.startDate} to ${tripInfo.endDate || '?'}` : ''}. Use this context when relevant.`
        : `The user has no active trip set up yet.`;

    const historyText = history
        .slice(-10)
        .map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n');

    const prompt = `You are PlanWitch Concierge, a friendly, concise AI travel assistant embedded in a trip-planning app.

${tripContext}

Conversation so far:
${historyText || '(start of conversation)'}

User: ${message}

Reply as the Assistant. Keep it conversational, helpful, and under 100 words unless the user asks for detail. If you don't have enough information to fully answer, ask a clarifying question instead of guessing.`;

    try {
        const text = await callGemini(prompt, false);
        return text.trim();
    } catch (error) {
        console.error('AI Chat Error:', error);
        throw error;
    }
};

// Generate comprehensive personalized plan (Full Itinerary + Packing + Food)
export const generateFullPersonalizedPlan = async (details) => {
    console.log(`[AI Service] Generating Nuclear Plan for ${details.startLocation} to ${details.endLocation}`);

    // --- PLAN LOGISTICS INJECTION (MACRO & MICRO) ---
    let localDataText = '';
    try {
        // 1. MACRO PLANNING (City to City)
        console.log(`[AI Service] Fetching MACRO routing graph`);
        const macroLocations = [details.startLocation];
        if (details.placesEnabled && details.stops && details.stops.length > 0) {
            macroLocations.push(...details.stops.map(s => s.location));
        }
        macroLocations.push(details.endLocation);

        const macroMatrix = await getMacroDistanceMatrix(macroLocations);
        if (macroMatrix) {
            localDataText += `\n\n═══════════════════════════════════════\nMACRO PLANNING (CITY-TO-CITY TRAVEL)\n═══════════════════════════════════════\n`;
            localDataText += `Distance Matrix (Travel Times between main cities/stops - USE STRICTLY):\n`;
            for (const [origin, targets] of Object.entries(macroMatrix)) {
                for (const [dest, info] of Object.entries(targets)) {
                    localDataText += `- ${origin} to ${dest}: ${info.duration} (${info.distance})\n`;
                }
            }
        }

        // 2. MICRO PLANNING (Inside Cities)
        console.log(`[AI Service] Fetching MICRO routing data for destinations`);
        const microDestinations = [];
        if (details.placesEnabled && details.stops) {
            microDestinations.push(...details.stops.map(s => s.location));
        }
        microDestinations.push(details.endLocation);

        localDataText += `\n═══════════════════════════════════════\nMICRO PLANNING (WITHIN DESTINATIONS)\n═══════════════════════════════════════\n`;
        for (const dest of microDestinations) {
            if (!dest || !dest.trim()) continue;
            console.log(`[AI Service] Micro-planning for ${dest}`);
            const places = await getNearbyPlaces(dest, 'tourist_attraction', 10);
            if (places && places.length > 0) {
                localDataText += `\nTop Nearby Places to consider in ${dest} (Prioritize these over assuming places):\n${places.map(p => `- ${p.name} (Rating: ${p.rating || 'N/A'})`).join('\n')}\n`;
                
                const matrix = await getDistanceMatrixBatch(places);
                if (matrix) {
                    localDataText += `Micro-Distance Matrix within ${dest} (Travel Times between places - USE STRICTLY for 'car' items):\n`;
                    for (const [origin, targets] of Object.entries(matrix)) {
                        for (const [destName, info] of Object.entries(targets)) {
                            localDataText += `- ${origin} to ${destName}: ${info.duration} (${info.distance})\n`;
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.warn(`[AI Service] Logistics data fetch failed:`, e);
    }
    // ------------------------------------

    const transitContext = details.transitModes?.length > 0 ? `Preferred inter-city transit: ${details.transitModes.join(', ')}.` : '';
    const routeContext = details.routeOptimization === 'follow-order' ? 'Follow the exact order of locations provided.' : 'Optimize the route order to minimize travel time between locations.';
    const stopsContext = details.placesEnabled ? `\n- Intermediate Stops: ${JSON.stringify(details.stops)}` : '';

    const prompt = `Act as a premium travel concierge. Create a comprehensive, billionaire-level travel plan based on these details:
- Start Location: ${details.startLocation}
- End Location / Main Destination: ${details.endLocation}${stopsContext}
- Total Days: ${details.totalDays}
- Budget: ${details.budget}
- Dietary Preference: ${details.dietary}
- Travelers: ${details.travelers} (Ages: ${details.ages})
- Additional Notes: ${details.additionalNotes}${localDataText}
${transitContext ? `- Transit Preferences: ${transitContext}\n` : ''}${routeContext ? `- Routing Logic: ${routeContext}\n` : ''}

PLANNING RULES (MANDATORY):

1. STRICT GEOGRAPHIC BOUNDS (NO HALLUCINATIONS)
   - You MUST ONLY suggest places physically located IN OR VERY NEAR the requested destinations (${details.endLocation}).
   - DO NOT suggest places in other states/cities just because they share a name (e.g., if asked for Gokarna, DO NOT suggest Mahabaleshwar in Maharashtra; use Mahabaleshwar Temple in Gokarna).
   - Verify the exact state/region of EVERY place you suggest before adding it.

2. TRAVEL AS SEPARATE ITEMS (MOST IMPORTANT RULE)
   - Between EVERY two consecutive activities, you MUST insert a TRAVEL item.
   - The travel item MUST have type "car" and include the estimated distance (in km) and travel time.
   - The travel item's "time" = when the previous activity ends (previous time + previous duration).
   - The next activity's "time" = travel item's "time" + travel item's "duration".
   - Example sequence:
     Activity A at 09:00 AM (1 hour) → Travel at 10:00 AM (20 mins, 4km) → Activity B at 10:20 AM (2 hours)
   - This is MANDATORY. An itinerary without travel items between activities is INVALID.

3. TIMING & OPERATING HOURS (CRITICAL)
   - You MUST verify the real-world opening/closing times of all attractions (e.g. National Parks, Temples, Museums). DO NOT schedule visits when a place is closed (e.g., Eravikulam National Park closes by 4 PM, so do not schedule it late afternoon).
   - DO NOT default to starting every day at 8:00 AM or 9:00 AM. Choose the most logical start time for each day based on the activities (e.g., start at 6:00 AM for sunrise or safaris, start at 10:00 AM for relaxed days).
   - Use real-world travel timings. No overlaps. Be generous with travel times.

4. SPECIFICITY: Use specific restaurant/place names, not generic ones.

Return ONLY a JSON object (no extra text) with this exact structure:
{
  "success": true,
  "itinerary": [
    {
      "day": 1,
      "title": "Day Title",
      "activities": [
        { "time": "08:00 AM", "title": "Breakfast at Place", "type": "breakfast", "duration": "45 minutes", "description": "Details", "location": "Place, Area", "cost": 150 },
        { "time": "08:45 AM", "title": "Travel to Next Place", "type": "car", "duration": "20 minutes", "description": "4 km by auto-rickshaw", "location": "En route", "cost": 100 },
        { "time": "09:05 AM", "title": "Next Activity", "type": "attraction", "duration": "2 hours", "description": "Details", "location": "Place, Area", "cost": 0 }
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
        const rawResult = await callGemini(prompt, true);
        if (rawResult && rawResult.success && rawResult.itinerary) {
            rawResult.itinerary = addMissingTravelItems(rawResult.itinerary);
        }
        return rawResult;
    } catch (error) {
        console.error("AI Error:", error);
        return { success: false, error: error.message };
    }
};
