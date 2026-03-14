import { AI_CONFIG } from '../config/aiConfig';

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
                    temperature: 0.8,
                    maxOutputTokens: 65536,
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
            if (isJson) {
                // Clean up common AI formatting issues
                text = text.replace(/```json/g, '').replace(/```/g, '').trim();

                // Try to parse, with fallback handling for truncated responses
                try {
                    return JSON.parse(text);
                } catch (parseError) {
                    console.warn('[AI] JSON parse failed, attempting recovery...');

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
export const generateTripItinerary = async (destination, days, budget, travelers, interests, preferences = {}) => {
    if (!AI_CONFIG.geminiKey) {
        console.warn('Using MOCK itinerary data (No API Key)');
        return new Promise(resolve => setTimeout(() => resolve(MOCK_ITINERARY), 2000));
    }

    const { pace = 'Moderate', startTime = '09:00 AM', endTime = '09:00 PM', locationDurations = {} } = preferences;

    const locationContext = Object.entries(locationDurations)
        .map(([loc, days]) => `- ${loc}: ${days} days`)
        .join('\n') || 'Distribute days evenly across all destinations';

    const hasTimings = startTime && endTime;

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

Per-Location Day Allocation:
${locationContext}

═══════════════════════════════════════
PLANNING RULES (MANDATORY)
═══════════════════════════════════════

1. TRAVEL LOGISTICS
   - Calculate REALISTIC travel time between every two consecutive activities using your knowledge of Google Maps distances
   - IMPORTANT: Activities 20km apart MUST have at least 30-45 mins of travel time between them.
   - Include 15-30 min buffer for traffic, parking, and transitions
   - Add airport/railway station check-in times where applicable (2 hrs for flights, 30 min for trains)
   - Optimize route to MINIMIZE backtracking — group nearby attractions together
   - EXCLUDE travel TO/FROM the destination (flights/trains to ${destination}). Plan starts when traveler is AT the destination.

2. DAILY TIME PLANNING
   - Structure each day into clear time blocks: Morning → Afternoon → Evening → Night
   - Events MUST be in STRICT CHRONOLOGICAL order with NO overlaps
   - Use realistic durations: 1.5-2 hrs for major attractions, 45 min-1 hr for meals, 30 min for quick stops
   - Include transition/travel time between locations as implicit buffer (do not list as separate activity)
   - IMPORTANT: Travel time is NOT teleportation. If the next activity is in a different neighborhood, leave a 30-60 min gap in the timeline for travel.
   - NO redundant activities — do not suggest similar cafes/snack stops multiple times on the same day

3. SMART ACTIVITY SELECTION
   - Select activities based on: traveler interests, seasonal weather suitability, crowd patterns (avoid peak tourist hours where possible), location proximity
   - PRIORITIZE in this order:
     a) Must-see landmarks and iconic experiences
     b) Hidden gems and local-only experiences (from Atlas Obscura, Culture Trip)
     c) Cultural immersion activities (cooking classes, art walks, local festivals)
     d) Nature and scenic spots
   - Include at least 1 "hidden gem" or unique local experience per day that most tourists miss

4. FOOD INTEGRATION
   - Include breakfast, lunch, and dinner as activities with specific restaurant/food spot suggestions
   - Recommend REAL, well-known restaurants or food streets — not generic "Local Restaurant"
   - Mention the signature dish to try at each food spot
   - Match food spots to the area being explored that day (no backtracking just for food)

5. PRACTICAL DETAILS PER ACTIVITY
   - "cost": Estimated cost per person in local currency (INR for India, USD for USA, EUR for Europe, etc.)
   - "duration": Realistic time including the activity itself
   - "description": 1-2 sentences explaining WHY this activity is special, what makes it worth visiting, and any pro tips
   - "location": Specific area/neighborhood name, not just city name

6. DAY THEMING
   - Give each day a clear thematic title that captures the essence of the day's plan
   - Example: "Heritage Walk & Street Food Trail", "Coastal Bliss & Sunset Cruise", "Cultural Deep Dive & Night Markets"

7. ALTERNATIVE SUGGESTIONS
   - For each day, include 1-2 optional alternative activities in the description of the main activity (e.g., "Alternative: If raining, visit XYZ indoor gallery instead")

═══════════════════════════════════════
ACTIVITY TYPES (use these exact strings)
═══════════════════════════════════════
Must be one of: 'flight', 'train', 'bus', 'car', 'hotel', 'checkin', 'checkout', 'breakfast', 'lunch', 'dinner', 'cafe', 'attraction', 'tour', 'shopping', 'nature', 'beach', 'museum', 'nightlife'

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
          "time": "09:00 AM",
          "title": "Specific Activity Name",
          "type": "attraction",
          "duration": "2 hours",
          "description": "Why this is special. Pro tip: arrive early to beat crowds. Alternative: Visit XYZ if weather is bad.",
          "location": "Specific Area/Neighborhood, City",
          "cost": 500
        }
      ]
    }
  ]
}

IMPORTANT: Return ONLY the JSON. No markdown, no code blocks, no explanations outside the JSON.`;

    try {
        return await callGemini(prompt, true);
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
