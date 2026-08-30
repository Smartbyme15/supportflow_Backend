const axios = require('axios');

const analyzeTicket = async (subject, description) => {
  try {
    const prompt = `
      Analyze this customer support ticket and return a JSON response with:
      - category: one of [Billing, Technical, Account, Order, Delivery, Refund, Other]
      - priority: one of [Low, Medium, High]
      - summary: brief 1-sentence summary (max 150 chars)

      Subject: ${subject}
      Description: ${description}

      Return ONLY valid JSON:
      {"category": "...", "priority": "...", "summary": "..."}
    `;

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a customer support ticket analyzer. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200,
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);

    // Validate the response
    const validCategories = ['Billing', 'Technical', 'Account', 'Order', 'Delivery', 'Refund', 'Other'];
    const validPriorities = ['Low', 'Medium', 'High'];

    const category = validCategories.includes(parsed.category) ? parsed.category : 'Other';
    const priority = validPriorities.includes(parsed.priority) ? parsed.priority : 'Medium';
    const summary = parsed.summary ? parsed.summary.substring(0, 150) : '';

    return {
      success: true,
      data: { category, priority, summary }
    };
  } catch (error) {
    console.error('AI Service Error:', error.message);
    return {
      success: false,
      error: 'AI analysis unavailable',
      details: error.message
    };
  }
};

module.exports = { analyzeTicket };