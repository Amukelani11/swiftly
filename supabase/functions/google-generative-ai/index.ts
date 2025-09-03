import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt, description } = await req.json()

    if (!description) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Google Generative AI API call
    const API_KEY = Deno.env.get('GOOGLE_API_KEY')
    if (!API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const systemPrompt = `You are an AI assistant that extracts store operating hours from descriptions. 
    Analyze the given store description and extract operating hours information.
    
    Return a JSON object with the following structure:
    {
      "operating_hours": {
        "monday": "hours or null",
        "tuesday": "hours or null", 
        "wednesday": "hours or null",
        "thursday": "hours or null",
        "friday": "hours or null",
        "saturday": "hours or null",
        "sunday": "hours or null",
        "holidays": "hours or null"
      },
      "special_notes": "any special notes about hours",
      "confidence": "high|medium|low"
    }
    
    Rules:
    - Extract hours in format like "9:00 AM - 6:00 PM" or "09:00-18:00"
    - If no hours found for a day, use null
    - If hours apply to all days, populate all days
    - Look for phrases like "open", "closes", "from", "to", "until"
    - Set confidence based on how clear the hours information is
    - Keep special_notes brief and relevant`

    const userPrompt = `Extract operating hours from this store description:

${description}

Please provide the operating hours in the specified JSON format.`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt + '\n\n' + userPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 1,
          maxOutputTokens: 1024,
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Google AI API error:', errorData)
      return new Response(
        JSON.stringify({ error: 'Failed to call Google Generative AI API' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text

    if (!generatedText) {
      return new Response(
        JSON.stringify({ error: 'No response from AI model' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Try to parse the JSON response from the AI
    let result
    try {
      // Extract JSON from the response (AI might wrap it in markdown)
      const jsonMatch = generatedText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || generatedText.match(/(\{[\s\S]*?\})/)
      const jsonString = jsonMatch ? jsonMatch[1] : generatedText
      result = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response',
          raw_response: generatedText
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
