import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Upload, User } from "lucide-react";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [userId, setUserId] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    likes: true,
    comments: true,
    follows: true,
    reposts: true,
    broken_hearts: true,
    comment_likes: true,
    tags: true,
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      setEmail(user.email || "");
      setPhone(user.phone || "");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url, banner_url, bio, is_private")
        .eq("id", user.id)
        .single();
      
      if (profile) {
        setUsername(profile.username);
        setDisplayName(profile.display_name || "");
        setAvatarUrl(profile.avatar_url || "");
        setBannerUrl(profile.banner_url || "");
        setBio(profile.bio || "");
        setIsPrivate(profile.is_private || false);
      }

      // Fetch notification settings
      const { data: settings } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (settings) {
        setNotificationSettings({
          likes: settings.likes,
          comments: settings.comments,
          follows: settings.follows,
          reposts: settings.reposts,
          broken_hearts: settings.broken_hearts,
          comment_likes: settings.comment_likes,
          tags: settings.tags,
        });
      }
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setLoading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/avatar-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Failed to upload avatar");
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to update avatar");
    } else {
      setAvatarUrl(publicUrl);
      toast.success("Avatar updated successfully");
    }
    setLoading(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setLoading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${userId}/banner-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("profiles")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Failed to upload banner");
      setLoading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("profiles")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ banner_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to update banner");
    } else {
      setBannerUrl(publicUrl);
      toast.success("Banner updated successfully");
    }
    setLoading(false);
  };

  const handleUpdateEmail = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email update initiated. Check your inbox for confirmation.");
    }
  };

  const handleUpdatePhone = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ phone });
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Phone number updated successfully");
    }
  };

  const handleUpdateUsername = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", user.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Username updated successfully");
      }
    }
    setLoading(false);
  };

  const handleUpdateDisplayName = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", user.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Display name updated successfully");
      }
    }
    setLoading(false);
  };

  const handleUpdateBio = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ bio })
        .eq("id", user.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Bio updated successfully");
      }
    }
    setLoading(false);
  };

  const handlePrivacyToggle = async (checked: boolean) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { error } = await supabase
        .from("profiles")
        .update({ is_private: checked })
        .eq("id", user.id);
      
      if (error) {
        toast.error(error.message);
      } else {
        setIsPrivate(checked);
        toast.success(checked ? "Account is now private" : "Account is now public");
      }
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone and will delete all your posts, comments, and other data.")) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.rpc("delete_user_account" as any);
      
      if (error) throw error;
      
      await supabase.auth.signOut();
      toast.success("Account deleted successfully");
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || "Failed to delete account");
    }
    setLoading(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleNotificationToggle = async (type: keyof typeof notificationSettings, checked: boolean) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if settings exist
      const { data: existing } = await supabase
        .from("notification_settings")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        // Update existing settings
        const { error } = await supabase
          .from("notification_settings")
          .update({ [type]: checked })
          .eq("user_id", user.id);
        
        if (error) {
          toast.error(error.message);
        } else {
          setNotificationSettings(prev => ({ ...prev, [type]: checked }));
          toast.success("Notification settings updated");
        }
      } else {
        // Create new settings
        const { error } = await supabase
          .from("notification_settings")
          .insert({ user_id: user.id, [type]: checked });
        
        if (error) {
          toast.error(error.message);
        } else {
          setNotificationSettings(prev => ({ ...prev, [type]: checked }));
          toast.success("Notification settings updated");
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>Update your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl || undefined} />
                <AvatarFallback className="text-2xl">
                  <User />
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                    <Upload className="h-4 w-4" />
                    Upload Avatar
                  </div>
                </Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Banner Image</CardTitle>
            <CardDescription>Update your profile banner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {bannerUrl && (
                <div
                  className="h-32 rounded-md bg-secondary"
                  style={{
                    backgroundImage: `url(${bannerUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              <div>
                <Label htmlFor="banner" className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 inline-flex">
                    <Upload className="h-4 w-4" />
                    Upload Banner
                  </div>
                </Label>
                <Input
                  id="banner"
                  type="file"
                  accept="image/*"
                  onChange={handleBannerUpload}
                  className="hidden"
                  disabled={loading}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Username</CardTitle>
            <CardDescription>Change your username</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdateUsername} disabled={loading}>
              Update Username
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bio</CardTitle>
            <CardDescription>Update your bio/description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>
            <Button onClick={handleUpdateBio} disabled={loading}>
              Update Bio
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Control who can see your profile and posts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="privacy">Private Account</Label>
                <p className="text-sm text-muted-foreground">
                  When your account is private, only followers can see your posts
                </p>
              </div>
              <Switch
                id="privacy"
                checked={isPrivate}
                onCheckedChange={handlePrivacyToggle}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email</CardTitle>
            <CardDescription>Update your email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdateEmail} disabled={loading}>
              Update Email
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phone Number</CardTitle>
            <CardDescription>Update your phone number</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1234567890"
              />
            </div>
            <Button onClick={handleUpdatePhone} disabled={loading}>
              Update Phone
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>Change your display name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your display name"
              />
            </div>
            <Button onClick={handleUpdateDisplayName} disabled={loading}>
              Update Display Name
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Change your password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={handleUpdatePassword} disabled={loading}>
              Update Password
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose which notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-likes">Likes</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone likes your post
                </p>
              </div>
              <Switch
                id="notif-likes"
                checked={notificationSettings.likes}
                onCheckedChange={(checked) => handleNotificationToggle("likes", checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-comments">Comments</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone comments on your post
                </p>
              </div>
              <Switch
                id="notif-comments"
                checked={notificationSettings.comments}
                onCheckedChange={(checked) => handleNotificationToggle("comments", checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-follows">Follows</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone follows you
                </p>
              </div>
              <Switch
                id="notif-follows"
                checked={notificationSettings.follows}
                onCheckedChange={(checked) => handleNotificationToggle("follows", checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-reposts">Reposts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone reposts your post
                </p>
              </div>
              <Switch
                id="notif-reposts"
                checked={notificationSettings.reposts}
                onCheckedChange={(checked) => handleNotificationToggle("reposts", checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-broken-hearts">Broken Hearts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone reacts with a broken heart
                </p>
              </div>
              <Switch
                id="notif-broken-hearts"
                checked={notificationSettings.broken_hearts}
                onCheckedChange={(checked) => handleNotificationToggle("broken_hearts", checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-tags">Tags</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone tags you in a post
                </p>
              </div>
              <Switch
                id="notif-tags"
                checked={notificationSettings.tags}
                onCheckedChange={(checked) => handleNotificationToggle("tags", checked)}
                disabled={loading}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notif-comment-likes">Comment Likes</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when someone likes your comment
                </p>
              </div>
              <Switch
                id="notif-comment-likes"
                checked={notificationSettings.comment_likes}
                onCheckedChange={(checked) => handleNotificationToggle("comment_likes", checked)}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Legal & Support</CardTitle>
            <CardDescription>View our terms and policies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate("/terms")}
                className="w-full"
              >
                Terms of Service
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/privacy")}
                className="w-full"
              >
                Privacy Policy
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Permanently delete your account and all data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount} 
              disabled={loading}
            >
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
