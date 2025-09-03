import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    console.log('🤖 Extract Hours API: Processing description:', description.substring(0, 100) + '...')

    // Get Google API key from environment
    const API_KEY = process.env.GOOGLE_API_KEY
    console.log('🤖 Extract Hours API: Google API key present:', !!API_KEY)
    if (!API_KEY) {
      console.error('🤖 Extract Hours API: Google API key not found in environment')
      return NextResponse.json(
        { error: 'Google API key not configured' },
        { status: 500 }
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

    // Call Google Generative AI directly
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
      console.error('🤖 Extract Hours API: Google AI API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to call Google Generative AI API' },
        { status: 500 }
      )
    }

    const data = await response.json()
    console.log('🤖 Extract Hours API: Google AI raw response:', data)

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
    console.log('🤖 Extract Hours API: Generated text:', generatedText)

    if (!generatedText) {
      console.error('🤖 Extract Hours API: No generated text in response')
      return NextResponse.json(
        { error: 'No response from AI model' },
        { status: 500 }
      )
    }

    // Try to parse the JSON response from the AI
    let result
    try {
      // Extract JSON from the response (AI might wrap it in markdown)
      const jsonMatch = generatedText.match(/```json\s*(\{[\s\S]*?\})\s*```/) || generatedText.match(/(\{[\s\S]*?\})/)
      const jsonString = jsonMatch ? jsonMatch[1] : generatedText
      console.log('🤖 Extract Hours API: JSON string to parse:', jsonString)
      result = JSON.parse(jsonString)
      console.log('🤖 Extract Hours API: Parsed result:', result)
    } catch (parseError) {
      console.error('🤖 Extract Hours API: Failed to parse AI response:', parseError)
      console.error('🤖 Extract Hours API: Raw AI response:', generatedText)
      return NextResponse.json({
        error: 'Failed to parse AI response',
        raw_response: generatedText
      }, { status: 500 })
    }

    console.log('🤖 Extract Hours API: Successfully extracted hours:', result)

    return NextResponse.json(result)

  } catch (error) {
    console.error('🤖 Extract Hours API: Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
