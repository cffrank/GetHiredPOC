import { DndContext, closestCorners, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Navigation } from '../components/Navigation';
import { useApplications, useUpdateApplication, useDeleteApplication } from '../hooks/useApplications';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import type { ApplicationStatus } from '@gethiredpoc/shared';

const STATUSES: ApplicationStatus[] = ['saved', 'applied', 'screening', 'interview', 'offer', 'rejected'];

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: 'Saved',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

function SortableApplication({ application, onDelete }: any) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: application.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card className="mb-2 cursor-move">
        <CardHeader className="p-4">
          <CardTitle className="text-sm">{application.job.title}</CardTitle>
          <CardDescription className="text-xs">{application.job.company}</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between items-center">
            <div className="flex gap-1">
              {application.job.remote === 1 && (
                <Badge className="text-xs bg-green-100 text-green-800">Remote</Badge>
              )}
              {application.job.remote === 2 && (
                <Badge className="text-xs bg-blue-100 text-blue-800">Hybrid</Badge>
              )}
              {application.job.remote === 0 && (
                <Badge className="text-xs bg-gray-100 text-gray-800">On-Site</Badge>
              )}
              {application.job.location && (
                <Badge className="text-xs">{application.job.location}</Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(application.id);
              }}
              className="h-6 px-2 text-xs"
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

  return (
    <div ref={setNodeRef} className="bg-gray-100 rounded-lg p-4 min-h-[200px]">
      {children}
    </div>
  );
}

export default function Applications() {
  const { data, isLoading } = useApplications();
  const updateApplicationMutation = useUpdateApplication();
  const deleteApplicationMutation = useDeleteApplication();

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
        <Navigation />
        <div className="p-8">Loading...</div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold mb-8">Application Tracker</h1>

          <DndContext collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {STATUSES.map((status) => (
                <DroppableColumn key={status} status={status}>
                  <h3 className="font-semibold mb-4 text-sm">
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
            <Card className="mt-8">
              <CardContent className="py-12 text-center">
                <p className="text-gray-500">No applications yet. Start applying for jobs!</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
