import { useNavigate } from 'react-router-dom';
import { DndContext, closestCorners, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useApplications, useUpdateApplication, useDeleteApplication } from '../hooks/useApplications';
import { useGamification } from '../hooks/useGamification';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FloatingShapesBackground } from '../components/effects/FloatingShapesBackground';
import { ProgressGamification } from '../components/gamification/ProgressGamification';
import { CuteRobotLoader } from '../components/loaders/CuteRobotLoader';
import type { ApplicationStatus } from '@gethiredpoc/shared';

const STATUSES: ApplicationStatus[] = ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected'];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: '💾 Saved',
  applied: '🚀 Applied',
  screening: '📋 Screening',
  interview: '🎤 Interview',
  offer: '🎉 Offer',
  rejected: '❌ Rejected',
};

function SortableApplication({ application, onDelete }: any) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: application.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-3 cursor-move touch-manipulation rounded-2xl shadow-3d-sm hover:shadow-3d-md hover:-translate-y-1 transition-all border-2 border-gray-100">
        <CardHeader className="p-3 sm:p-4">
          <CardTitle
            className="text-sm sm:text-base font-bold text-purple-deep hover:underline cursor-pointer"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              navigate(`/jobs/${application.job_id}`);
            }}
          >
            {application.job.title}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm font-medium">{application.job.company}</CardDescription>
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-wrap gap-1.5">
              {application.job.remote === 1 && (
                <Badge className="text-xs bg-gradient-to-br from-green-500 to-green-600 text-white shadow-3d-sm">🌍 Remote</Badge>
              )}
              {application.job.remote === 2 && (
                <Badge className="text-xs bg-gradient-to-br from-violet to-teal text-white shadow-3d-sm">🏢 Hybrid</Badge>
              )}
              {application.job.remote === 0 && (
                <Badge className="text-xs bg-white border-2 border-gray-200 text-gray-700 shadow-3d-sm">🏢 On-Site</Badge>
              )}
              {application.job.location && (
                <Badge className="text-xs bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-3d-sm">📍 {application.job.location}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(application.id);
              }}
              className="h-8 w-8 p-0 text-xl min-h-touch min-w-touch flex-shrink-0 hover:bg-red-50 hover:text-red-600 transition-all rounded-lg"
            >
              ×
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DroppableColumn({ status, children }: { status: ApplicationStatus; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  const columnColors: Record<ApplicationStatus, string> = {
    saved: 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200',
    applied: 'bg-gradient-to-br from-violet/5 to-violet/10 border-violet/30',
    screening: 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200',
    interview: 'bg-gradient-to-br from-teal/5 to-teal/10 border-teal/30',
    offer: 'bg-gradient-to-br from-green-50 to-green-100 border-green-200',
    rejected: 'bg-gradient-to-br from-red-50 to-red-100 border-red-200',
  };

  return (
    <div ref={setNodeRef} className={`${columnColors[status]} border-2 rounded-2xl p-3 sm:p-4 min-h-[200px] shadow-card-soft`}>
      {children}
    </div>
  );
}

export default function Applications() {
  const { data, isLoading } = useApplications();
  const updateApplicationMutation = useUpdateApplication();
  const deleteApplicationMutation = useDeleteApplication();
  const { data: gamificationData } = useGamification();

  const applicationsByStatus = STATUSES.reduce((acc, status) => {
    acc[status] = data?.applications.filter((app: any) => app.status === status) || [];
    return acc;
  }, {} as Record<ApplicationStatus, any[]>);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    // Check if dropped on a status column (droppable zone)
    const newStatus = over.id as ApplicationStatus;

    // Only update if it's a valid status and different from current
    if (STATUSES.includes(newStatus)) {
      const currentApp = data?.applications.find((app: any) => app.id === active.id);
      if (currentApp && currentApp.status !== newStatus) {
        updateApplicationMutation.mutate({
          id: active.id as string,
          updates: { status: newStatus },
        });
      }
    }
  };

  if (isLoading) {
    return (
      <>
        <FloatingShapesBackground />
        <div className="relative z-10">
          <CuteRobotLoader message="Loading your applications..." />
        </div>
      </>
    );
  }

  return (
    <>
      <FloatingShapesBackground />
      <div className="relative z-10 min-h-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-purple-deep mb-8">Application Tracker 📊</h1>

          {/* Gamification Progress */}
          {gamificationData && (
            <ProgressGamification
              level={gamificationData.level}
              xp={gamificationData.xp}
              xpMax={gamificationData.xpMax}
              achievements={gamificationData.achievements}
            />
          )}

          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {STATUSES.map((status) => (
                <DroppableColumn key={status} status={status}>
                  <h3 className="font-extrabold mb-4 text-sm sm:text-base text-purple-deep">
                    {STATUS_LABELS[status]} ({applicationsByStatus[status].length})
                  </h3>
                  <SortableContext
                    items={applicationsByStatus[status].map((app: any) => app.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {applicationsByStatus[status].map((application: any) => (
                      <SortableApplication
                        key={application.id}
                        application={application}
                        onDelete={deleteApplicationMutation.mutate}
                      />
                    ))}
                  </SortableContext>
                </DroppableColumn>
              ))}
            </div>
          </DndContext>

          {data?.applications.length === 0 && (
            <Card className="mt-8 rounded-3xl shadow-card-soft border-2 border-gray-100">
              <CardContent className="py-16 text-center">
                <div className="text-7xl mb-6 animate-bounce-gentle">🚀</div>
                <p className="text-xl font-bold text-purple-deep mb-2">No applications yet</p>
                <p className="text-gray-500">Start applying for jobs and track your progress here!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
