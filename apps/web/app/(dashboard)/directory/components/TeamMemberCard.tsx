'use client';

import { Mail, Clock, FileText, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface TeamMemberCardProps {
  member: any;
  onEdit: (member: any) => void;
  onDelete: (memberId: string) => void;
  onUploadDocument: (memberId: string) => void;
}

export function TeamMemberCard({
  member,
  onEdit,
  onDelete,
  onUploadDocument,
}: TeamMemberCardProps) {
  return (
    <Card className="hover:bg-white/5 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{member.name}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 mt-1">
              <Mail className="w-4 h-4" />
              <a href={`mailto:${member.email}`} className="hover:text-white transition-colors">
                {member.email}
              </a>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(member)}
              className="p-2 hover:bg-white/10 rounded transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
            <button
              onClick={() => onDelete(member.id)}
              className="p-2 hover:bg-red-500/10 rounded transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </div>

        {/* Working Hours & Role */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          {member.workingHours && (
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{member.workingHours}</span>
            </div>
          )}
          {member.role && (
            <div className="text-gray-400">
              <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">
                {member.role}
              </span>
            </div>
          )}
        </div>

        {/* Documents Section */}
        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Documents
            </label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUploadDocument(member.id)}
              className="text-xs"
            >
              Upload
            </Button>
          </div>
          <div className="text-xs text-gray-500">
            Documents will appear here after upload
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
