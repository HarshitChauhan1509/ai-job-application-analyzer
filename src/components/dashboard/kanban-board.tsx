"use client";

import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building, MapPin, MoreHorizontal, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";
import { updateApplicationStatusAction } from "@/app/actions/application";

// Mock data types
type Application = {
  id: string;
  company: string;
  position: string;
  location: string;
  match: number;
  date: string;
  status: string;
};

type Column = {
  id: string;
  title: string;
  applicationIds: string[];
};

type BoardData = {
  applications: Record<string, Application>;
  columns: Record<string, Column>;
  columnOrder: string[];
};

const initialData: BoardData = {
  applications: {
    "app-1": { id: "app-1", company: "Google", position: "Senior Frontend Engineer", location: "Remote", match: 91, date: "2 days ago", status: "INTERVIEW" },
    "app-2": { id: "app-2", company: "Linear", position: "Product Engineer", location: "San Francisco", match: 88, date: "4 days ago", status: "APPLIED" },
    "app-3": { id: "app-3", company: "Vercel", position: "Software Engineer", location: "Remote", match: 82, date: "1 week ago", status: "SCREENING" },
    "app-4": { id: "app-4", company: "Stripe", position: "Frontend Developer", location: "New York", match: 75, date: "2 weeks ago", status: "REJECTED" },
    "app-5": { id: "app-5", company: "Meta", position: "UI Engineer", location: "Menlo Park", match: 85, date: "3 days ago", status: "SAVED" },
  },
  columns: {
    "SAVED": { id: "SAVED", title: "Saved", applicationIds: ["app-5"] },
    "APPLIED": { id: "APPLIED", title: "Applied", applicationIds: ["app-2"] },
    "SCREENING": { id: "SCREENING", title: "Screening", applicationIds: ["app-3"] },
    "INTERVIEW": { id: "INTERVIEW", title: "Interview", applicationIds: ["app-1"] },
    "OFFER": { id: "OFFER", title: "Offer", applicationIds: [] },
    "REJECTED": { id: "REJECTED", title: "Rejected", applicationIds: ["app-4"] },
  },
  columnOrder: ["SAVED", "APPLIED", "SCREENING", "INTERVIEW", "OFFER", "REJECTED"],
};

export function KanbanBoard() {
  const [data, setData] = useState<BoardData>(initialData);
  const [isMounted, setIsMounted] = useState(false);

  // Fix hydration issues with react-beautiful-dnd
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const startColumn = data.columns[source.droppableId];
    const finishColumn = data.columns[destination.droppableId];

    // Moving within the same column
    if (startColumn === finishColumn) {
      const newApplicationIds = Array.from(startColumn.applicationIds);
      newApplicationIds.splice(source.index, 1);
      newApplicationIds.splice(destination.index, 0, draggableId);

      const newColumn = {
        ...startColumn,
        applicationIds: newApplicationIds,
      };

      setData({
        ...data,
        columns: {
          ...data.columns,
          [newColumn.id]: newColumn,
        },
      });
      return;
    }

    // Moving from one column to another
    const startApplicationIds = Array.from(startColumn.applicationIds);
    startApplicationIds.splice(source.index, 1);
    const newStart = {
      ...startColumn,
      applicationIds: startApplicationIds,
    };

    const finishApplicationIds = Array.from(finishColumn.applicationIds);
    finishApplicationIds.splice(destination.index, 0, draggableId);
    const newFinish = {
      ...finishColumn,
      applicationIds: finishApplicationIds,
    };

    // Optimistic UI update
    setData({
      ...data,
      columns: {
        ...data.columns,
        [newStart.id]: newStart,
        [newFinish.id]: newFinish,
      },
    });

    // In a real app, we'd trigger the server action here
    try {
      // await updateApplicationStatusAction(draggableId, finishColumn.id);
      console.log(`Updated application ${draggableId} to status ${finishColumn.id}`);
    } catch (error) {
      console.error("Failed to update status", error);
      // Revert state if failed
    }
  };

  if (!isMounted) {
    return <div className="h-[600px] w-full flex items-center justify-center text-muted-foreground">Loading board...</div>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-6 h-[calc(100vh-12rem)] min-w-full overflow-x-auto pb-4">
        {data.columnOrder.map((columnId) => {
          const column = data.columns[columnId];
          const applications = column.applicationIds.map(
            (appId) => data.applications[appId]
          );

          return (
            <div key={column.id} className="flex flex-col w-80 shrink-0">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{column.title}</h3>
                <Badge variant="secondary" className="bg-muted text-muted-foreground font-medium rounded-full">{applications.length}</Badge>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`flex-1 rounded-xl p-2 transition-colors ${
                      snapshot.isDraggingOver ? "bg-muted/50 border border-dashed border-primary/30" : "bg-muted/10 border border-transparent"
                    }`}
                  >
                    <div className="space-y-3 min-h-[150px]">
                      {applications.map((app, index) => (
                        <Draggable key={app.id} draggableId={app.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{
                                ...provided.draggableProps.style,
                              }}
                            >
                              <Card className={`group border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'rotate-2 shadow-lg ring-1 ring-primary/20' : ''}`}>
                                <CardContent className="p-4 flex flex-col gap-3">
                                  <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2 max-w-[80%]">
                                      <div className="w-8 h-8 rounded shrink-0 bg-background border flex items-center justify-center font-bold text-xs">
                                        {app.company.charAt(0)}
                                      </div>
                                      <div className="truncate">
                                        <p className="font-semibold text-sm truncate" title={app.position}>{app.position}</p>
                                        <p className="text-xs text-muted-foreground truncate" title={app.company}>{app.company}</p>
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <span className="text-[10px] uppercase font-bold text-muted-foreground mb-0.5">Match</span>
                                      <span className={`text-xs font-bold ${app.match >= 90 ? 'text-green-600' : app.match >= 80 ? 'text-primary' : 'text-amber-600'}`}>{app.match}%</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mt-2 pt-3 border-t border-border/50">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                      <Calendar size={12} />
                                      {app.date}
                                    </div>
                                    <Link href={`/dashboard/applications/${app.id}`}>
                                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-primary font-medium">
                                        Details <ArrowRight size={12} />
                                      </div>
                                    </Link>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
