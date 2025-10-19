import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Trash2, CheckCircle, XCircle } from 'lucide-react';

interface Report {
  id: string;
  content_type: string;
  content_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporter: {
    username: string;
  } | null;
}

const AdminReports = () => {
  const navigate = useNavigate();
  const { isAdmin, isModerator, loading: adminLoading } = useAdmin();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin && !isModerator) {
      navigate('/');
    }
  }, [isAdmin, isModerator, adminLoading, navigate]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('content_reports')
      .select(`
        *,
        reporter:reporter_id(username:profiles!reporter_id(username))
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setReports(data as any);
    }
    setLoading(false);
  };

  const handleReview = (report: Report) => {
    setSelectedReport(report);
    setReviewDialogOpen(true);
  };

  const updateReportStatus = async (status: string) => {
    if (!selectedReport) return;

    const { error } = await supabase
      .from('content_reports')
      .update({
        status,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
        admin_notes: adminNotes || null,
      })
      .eq('id', selectedReport.id);

    if (error) {
      toast.error('Failed to update report');
    } else {
      toast.success(`Report ${status}`);
      setReviewDialogOpen(false);
      setAdminNotes('');
      fetchReports();
    }
  };

  const handleDeleteContent = async () => {
    if (!selectedReport) return;

    const table = selectedReport.content_type === 'post' ? 'posts' : 'comments';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', selectedReport.content_id);

    if (error) {
      toast.error('Failed to delete content');
    } else {
      await updateReportStatus('resolved');
      toast.success('Content deleted');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'default';
      case 'reviewed': return 'secondary';
      case 'resolved': return 'success';
      case 'dismissed': return 'destructive';
      default: return 'default';
    }
  };

  if (adminLoading || (!isAdmin && !isModerator)) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 pt-20 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">Content Reports</h1>
          </div>

          {loading ? (
            <div className="text-center py-8">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No reports found</div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="capitalize">{report.content_type}</TableCell>
                      <TableCell>
                        {report.reporter?.username || 'Anonymous'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{report.reason}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(report.status) as any}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(report.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(report)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
            <DialogDescription>
              {selectedReport?.content_type} reported by {selectedReport?.reporter?.username || 'Anonymous'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <p className="text-sm">{selectedReport?.reason}</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Admin Notes</label>
              <Textarea
                placeholder="Enter notes about this report..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteContent}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Content
            </Button>
            <Button variant="outline" onClick={() => updateReportStatus('dismissed')}>
              <XCircle className="h-4 w-4 mr-2" />
              Dismiss
            </Button>
            <Button onClick={() => updateReportStatus('resolved')}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReports;
