// Skills Gap Analysis
// Identifies missing skills for target roles and provides learning recommendations

export interface SkillsGap {
  missingSkills: string[];
  recommendedLearning: Array<{
    skill: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    estimatedTime: string;
    resources: string[];
  }>;
  estimatedTimeToReady: string;
}

/**
 * Analyze skills gap for a target job title
 */
export async function analyzeSkillsGap(
  ai: any,
  db: D1Database,
  userId: string,
  targetJobTitle: string
): Promise<SkillsGap> {
  // Get user's current skills
  const userResult = await db.prepare('SELECT skills FROM users WHERE id = ?').bind(userId).first();
  if (!userResult) {
    throw new Error('User not found');
  }

  const user = userResult as any;
  const userSkills = user.skills ? JSON.parse(user.skills) : [];

  // Get common skills from similar jobs
  const similarJobsResult = await db.prepare(`
    SELECT requirements FROM jobs
    WHERE title LIKE ?
    AND requirements IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 20
  `).bind(`%${targetJobTitle}%`).all();

  const allRequiredSkills: string[] = [];
  for (const job of (similarJobsResult.results || [])) {
    const jobData = job as any;
    if (jobData.requirements) {
      try {
        const requirements = JSON.parse(jobData.requirements);
        allRequiredSkills.push(...requirements);
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }

  // Count skill frequency
  const skillFrequency: Record<string, number> = {};
  for (const skill of allRequiredSkills) {
    skillFrequency[skill] = (skillFrequency[skill] || 0) + 1;
  }

  // Find missing skills (required in >50% of jobs)
  const minFrequency = Math.ceil((similarJobsResult.results?.length || 0) * 0.5);
  const missingSkills = Object.entries(skillFrequency)
    .filter(([skill, count]) => count >= minFrequency && !userSkills.includes(skill))
    .map(([skill]) => skill);

  // Generate learning recommendations with AI
  const prompt = `You are a career development advisor. Analyze this skills gap and provide learning recommendations.

Current Skills: ${userSkills.join(', ')}
Target Role: ${targetJobTitle}
Missing Skills: ${missingSkills.join(', ')}

For each missing skill, provide:
1. Priority (high/medium/low) based on job market demand
2. Reason why this skill is important
3. Estimated time to learn (beginner to job-ready)
4. 2-3 recommended free learning resources (URLs)

Return ONLY valid JSON:
{
  "recommendations": [
    {
      "skill": "Python",
      "priority": "high",
      "reason": "Required in 90% of data science roles",
      "estimatedTime": "3-4 months",
      "resources": [
        "https://www.python.org/about/gettingstarted/",
        "https://www.coursera.org/learn/python",
        "https://realpython.com/"
      ]
    }
  ],
  "overallTimeEstimate": "4-6 months to become competitive"
}`;

  try {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
      prompt,
      max_tokens: 1500,
      temperature: 0.7
    });

    const result = parseSkillsGapJSON(response.response);

    return {
      missingSkills,
      recommendedLearning: result.recommendations,
      estimatedTimeToReady: result.overallTimeEstimate
    };
  } catch (error) {
    console.error('Skills gap analysis error:', error);
    throw new Error('Failed to analyze skills gap');
  }
}

/**
 * Parse JSON from AI response
 */
function parseSkillsGapJSON(text: string): {
  recommendations: Array<{
    skill: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
    estimatedTime: string;
    resources: string[];
  }>;
  overallTimeEstimate: string;
} {
  try {
    // Try to extract JSON from markdown code blocks or direct JSON
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) ||
                      text.match(/```\n([\s\S]*?)\n```/) ||
                      text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const jsonText = jsonMatch[1] || jsonMatch[0];
    const parsed = JSON.parse(jsonText);

    return {
      recommendations: parsed.recommendations || [],
      overallTimeEstimate: parsed.overallTimeEstimate || 'Unknown'
    };
  } catch (error) {
    console.error('JSON parsing error:', error);
    throw new Error(`Failed to parse skills gap JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
