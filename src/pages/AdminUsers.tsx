import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import AdminNav from '@/components/AdminNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Search, Ban, Trash2, UserCheck } from 'lucide-react';

interface UserWithProfile {
  id: string;
  email: string;
  created_at: string;
  profiles: {
    username: string;
    display_name: string;
  } | null;
  user_suspensions: {
    reason: string;
    is_permanent: boolean;
  } | null;
}

const AdminUsers = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDuration, setSuspendDuration] = useState('permanent');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let filtered = users.filter(user => 
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.profiles?.display_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    // Sort by date
    filtered = filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    setFilteredUsers(filtered);
  }, [searchQuery, users, sortBy]);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, created_at');

    if (!profiles) {
      setLoading(false);
      return;
    }

    const userIds = profiles.map(p => p.id);
    
    const { data: suspensions } = await supabase
      .from('user_suspensions')
      .select('user_id, reason, is_permanent')
      .in('user_id', userIds);

    const usersWithProfiles = profiles.map(profile => ({
      id: profile.id,
      email: '',
      created_at: profile.created_at,
      profiles: { username: profile.username, display_name: profile.display_name },
      user_suspensions: suspensions?.find(s => s.user_id === profile.id) || null,
    }));

    setUsers(usersWithProfiles);
    setFilteredUsers(usersWithProfiles);
    setLoading(false);
  };

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleAllUsers = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSuspend = async () => {
    if (selectedUsers.size === 0) return;

    const expiresAt = suspendDuration === 'permanent' ? null :
      suspendDuration === '7days' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() :
      suspendDuration === '30days' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() :
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    for (const userId of Array.from(selectedUsers)) {
      await supabase.from('user_suspensions').upsert({
        user_id: userId,
        suspended_by: (await supabase.auth.getUser()).data.user?.id,
        reason: suspendReason,
        is_permanent: suspendDuration === 'permanent',
        expires_at: expiresAt,
      });
    }

    toast.success(`Suspended ${selectedUsers.size} user(s)`);
    setSuspendDialogOpen(false);
    setSuspendReason('');
    setSelectedUsers(new Set());
    fetchUsers();
  };

  const handleDelete = async () => {
    if (selectedUsers.size === 0) return;

    const { error } = await supabase.rpc('admin_bulk_delete_users', {
      user_ids: Array.from(selectedUsers)
    });

    if (error) {
      toast.error('Failed to delete users');
      console.error(error);
    } else {
      toast.success(`Deleted ${selectedUsers.size} user(s)`);
    }

    setDeleteDialogOpen(false);
    setSelectedUsers(new Set());
    fetchUsers();
  };

  const handleUnsuspend = async (userId: string) => {
    await supabase
      .from('user_suspensions')
      .delete()
      .eq('user_id', userId);

    toast.success('User unsuspended');
    fetchUsers();
  };

  if (adminLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto px-4 pt-8 pb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">User Management</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Button
                variant={sortBy === 'newest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('newest')}
              >
                Newest First
              </Button>
              <Button
                variant={sortBy === 'oldest' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy('oldest')}
              >
                Oldest First
              </Button>
            </div>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedUsers.size > 0 && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSuspendDialogOpen(true)}>
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend ({selectedUsers.size})
                </Button>
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedUsers.size})
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={toggleAllUsers}
                      />
                    </TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.profiles?.username || 'No username'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.user_suspensions ? (
                          <span className="text-destructive">Suspended</span>
                        ) : (
                          <span className="text-green-600">Active</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.user_suspensions ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnsuspend(user.id)}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Unsuspend
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Users</DialogTitle>
            <DialogDescription>
              Suspend {selectedUsers.size} selected user(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Duration</label>
              <Select value={suspendDuration} onValueChange={setSuspendDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">7 Days</SelectItem>
                  <SelectItem value="30days">30 Days</SelectItem>
                  <SelectItem value="1year">1 Year</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Reason</label>
              <Textarea
                placeholder="Enter suspension reason..."
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSuspend}>Suspend</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Users</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete {selectedUsers.size} user(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
