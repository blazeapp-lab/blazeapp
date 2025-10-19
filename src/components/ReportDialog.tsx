import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { z } from 'zod';

const reportSchema = z.object({
  reason: z.string()
    .trim()
    .min(10, { message: "Reason must be at least 10 characters" })
    .max(1000, { message: "Reason must be 1000 characters or less" })
});

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentType: 'post' | 'comment' | 'profile';
  contentId: string;
}

export const ReportDialog = ({ open, onOpenChange, contentType, contentId }: ReportDialogProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be logged in to report content');
      return;
    }

    setLoading(true);

    try {
      const validatedData = reportSchema.parse({ reason });

      const { error } = await supabase
        .from('content_reports')
        .insert({
          reporter_id: user.id,
          content_type: contentType,
          content_id: contentId,
          reason: validatedData.reason,
        });

      if (error) throw error;

      toast.success('Report submitted successfully');
      setReason('');
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error('Failed to submit report');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {contentType}</DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this {contentType}
          </DialogDescription>
        </DialogHeader>
        <div>
          <label className="text-sm font-medium mb-2 block">
            Reason for reporting
          </label>
          <Textarea
            placeholder="Please describe the issue..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
