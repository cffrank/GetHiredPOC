import { Link } from 'react-router-dom';
import { Badge } from './ui/Badge';
import { Button3D } from './ui/Button3D';
import { MatchScoreDial } from './ui/MatchScoreDial';

interface JobCard3DProps {
  job: any;
  showMatchScore?: boolean;
}

export function JobCard3D({ job, showMatchScore = false }: JobCard3DProps) {
  // Calculate a mock match score if not provided (for demo purposes)
  const matchScore = job.match_score || Math.floor(Math.random() * 30 + 70);

  return (
    <div className="relative group transition-transform duration-300 hover:-translate-y-3">
      {/* Floating shadow */}
      <div className="absolute -bottom-3 left-2 right-2 h-6 bg-gradient-radial from-violet/20 to-transparent blur-xl transition-all group-hover:-bottom-5 group-hover:opacity-40" />

      {/* Card content */}
      <div className="relative z-10 bg-white rounded-3xl p-8 shadow-card-soft">
        <div className="flex justify-between items-start gap-6 mb-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <h3 className="text-3xl font-extrabold text-purple-deep mb-2">{job.title}</h3>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-8 h-8 bg-gradient-to-br from-violet to-teal rounded-lg flex items-center justify-center text-lg">
                🏢
              </div>
              <span>{job.company}</span>
            </div>
          </div>

          {/* Match Score Dial */}
          {showMatchScore && (
            <MatchScoreDial score={matchScore} />
          )}
        </div>

        {/* Badges */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {job.remote === 1 && <Badge variant="remote">Remote 🌍</Badge>}
          {job.remote === 2 && <Badge variant="default">Hybrid 🏢</Badge>}
          {job.remote === 0 && <Badge variant="default">On-Site 🏢</Badge>}
          {job.location && <Badge variant="default">{job.location}</Badge>}
          {job.salary_min && job.salary_max && (
            <Badge variant="salary">
              ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()} 💰
            </Badge>
          )}
          {showMatchScore && matchScore >= 85 && <Badge variant="hot">Hot 🔥</Badge>}
        </div>

        {/* Description */}
        <p className="text-gray-600 leading-relaxed mb-6 line-clamp-2">{job.description}</p>

        {/* CTA */}
        <Link to={`/jobs/${job.id}`}>
          <Button3D icon="🚀">
            View Details
          </Button3D>
        </Link>
      </div>
    </div>
  );
}
