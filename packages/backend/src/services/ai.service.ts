import type { AIAnalysis } from '@gethiredpoc/shared';

export async function mockJobAnalysis(
  userSkills: string[],
  jobRequirements: string[]
): Promise<AIAnalysis> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate realistic mock score based on skill overlap
  const matchingSkills = userSkills.filter((skill) =>
    jobRequirements.some(
      (req) =>
        req.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(req.toLowerCase())
    )
  );

  const missingSkills = jobRequirements.filter(
    (req) =>
      !userSkills.some(
        (skill) =>
          req.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(req.toLowerCase())
      )
  );

  const baseScore = 70;
  const overlapBonus = Math.min(25, matchingSkills.length * 5);
  const randomBonus = Math.floor(Math.random() * 10);
  const matchScore = Math.min(95, baseScore + overlapBonus + randomBonus);

  // Generate recommendations
  const recommendations = [
    "Highlight your relevant experience in your application",
    "Prepare examples that demonstrate your matching skills",
  ];

  if (missingSkills.length > 0) {
    recommendations.push(
      `Consider addressing how you've worked with similar technologies to ${missingSkills[0]}`
    );
  }

  // Summary
  let summary = "Reasonable match for this position";
  if (matchScore >= 85) {
    summary = "Excellent match - highly recommend applying";
  } else if (matchScore >= 75) {
    summary = "Good match - strong candidate for this role";
  }

  // Derive recommendation level from score
  let recommendation: 'strong' | 'good' | 'fair' | 'weak' = 'fair';
  if (matchScore >= 85) recommendation = 'strong';
  else if (matchScore >= 75) recommendation = 'good';
  else if (matchScore >= 50) recommendation = 'fair';
  else recommendation = 'weak';

  return {
    score: matchScore,
    recommendation,
    strengths: matchingSkills.slice(0, 5),
    gaps: missingSkills.slice(0, 5),
    tip: recommendations[0] || summary,
  };
}
