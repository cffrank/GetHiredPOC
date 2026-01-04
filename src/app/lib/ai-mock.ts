export interface AIAnalysis {
  score: number;
  strengths: string[];
  concerns: string[];
  recommendation: string;
}

export async function mockJobAnalysis(
  userSkills: string[],
  jobRequirements: string[]
): Promise<AIAnalysis> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Generate realistic mock score based on skill overlap
  const overlap = userSkills.filter((skill) =>
    jobRequirements.some(
      (req) =>
        req.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(req.toLowerCase())
    )
  );

  const baseScore = 70;
  const overlapBonus = Math.min(25, overlap.length * 5);
  const randomBonus = Math.floor(Math.random() * 10);
  const score = Math.min(95, baseScore + overlapBonus + randomBonus);

  // Generate strengths
  const strengths = [
    "Strong technical skills align well with job requirements",
    "Experience level appears appropriate for this role",
    "Your background shows relevant domain expertise",
  ];

  if (overlap.length > 0) {
    strengths.push(
      `Direct experience with ${overlap.slice(0, 2).join(" and ")}`
    );
  }

  // Generate concerns
  const concerns = [];
  if (score < 80) {
    concerns.push("Some required skills may need development");
  }
  if (jobRequirements.length - overlap.length > 3) {
    concerns.push(
      "Several job requirements not explicitly listed in your profile"
    );
  }

  // Recommendation
  let recommendation = "Strong match";
  if (score >= 85) {
    recommendation = "Excellent match - highly recommend applying";
  } else if (score >= 75) {
    recommendation = "Good match - recommend applying";
  } else {
    recommendation = "Reasonable match - consider highlighting relevant experience";
  }

  return {
    score,
    strengths: strengths.slice(0, 4),
    concerns: concerns.length > 0 ? concerns : ["No major concerns identified"],
    recommendation,
  };
}
