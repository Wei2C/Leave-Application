import { GoogleGenAI } from "@google/genai";
import { LeaveRequest, USER_NAME, MANAGER_EMAIL } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateLeaveEmailDraft = async (request: LeaveRequest, remainingAnnualLeave: number): Promise<{ subject: string; body: string }> => {
  if (request.dates.length === 0 || !request.type) {
    throw new Error("Missing dates or leave type");
  }

  // Format dates: "YYYY/MM/DD, YYYY/MM/DD"
  const dateStrings = request.dates.map(d => 
    d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
  );
  
  const dateStrDisplay = dateStrings.join(', ');
  
  let timeDescription = "";
  const daysCount = request.dates.length;

  switch (request.durationType) {
    case '整天 (Full Day)':
      timeDescription = `${daysCount} 天 (Whole Day${daysCount > 1 ? 's' : ''})`;
      break;
    case '半天 (Half Day)':
      timeDescription = `${daysCount} x 0.5 天 (${request.halfDayPeriod === 'AM' ? '上午' : '下午'})`;
      break;
    case '選小時 (Hourly)':
      timeDescription = `${request.startHour} ~ ${request.endHour} (per day for ${daysCount} days)`;
      break;
  }

  // Simplified, informal, bullet-point prompt
  const prompt = `
    You are writing a leave request email for ${USER_NAME} to her manager.
    
    Format requirements:
    1. Language: Traditional Chinese (繁體中文) mixed with English for specific terms if needed.
    2. Tone: Casual but polite, direct, bullet points (條列式). Not too formal.
    3. Content must include:
       - Leave Type (假別)
       - Dates (日期) - list all dates: ${dateStrDisplay}
       - Duration/Time (時間)
    
    Data:
    - Type: ${request.type}
    - Dates: ${dateStrDisplay}
    - Time: ${timeDescription}
    
    Output strictly in JSON format with two keys: "subject" and "body".
    
    Example Body format:
    Hi [Manager Name],
    
    Maggie 請假申請：
    - 項目：...
    - 日期：...
    - 時間：...
    
    Thanks,
    ${USER_NAME}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating email:", error);
    // Fallback if AI fails
    const subjectDate = dateStrings.length > 1 ? `${dateStrings[0]}...` : dateStrings[0];
    return {
      subject: `請假通知 - ${USER_NAME} - ${subjectDate}`,
      body: `Hi,\n\nMaggie 請假申請:\n- 項目: ${request.type}\n- 日期: ${dateStrDisplay}\n- 時間: ${timeDescription}\n\nThanks,\n${USER_NAME}`
    };
  }
};