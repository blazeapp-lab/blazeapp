import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload } from "lucide-react";
import { z } from "zod";

const profileSchema = z.object({
  displayName: z.string().trim().max(32, { message: "Display name must be 32 characters or less" }).optional(),
  bio: z.string().trim().max(500, { message: "Bio too long (max 500 characters)" }).optional(),
  website: z.string().trim().url({ message: "Invalid website URL" }).max(200, { message: "URL too long" }).optional().or(z.literal("")),
  location: z.string().trim().max(100, { message: "Location too long" }).optional(),
});

const validateImageFile = async (file: File): Promise<boolean> => {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  // Check MIME type
  if (!validTypes.includes(file.type)) {
    return false;
  }
  
  // Check file signature (magic bytes)
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Check for common image file signatures
  const signatures = {
    'ffd8ff': 'jpeg',
    '89504e47': 'png',
    '47494638': 'gif',
    '52494646': 'webp',
  };
  
  return Object.keys(signatures).some(sig => hex.startsWith(sig));
};

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    website: string | null;
    location: string | null;
  };
  onProfileUpdated: () => void;
}

const EditProfileDialog = ({ open, onOpenChange, profile, onProfileUpdated }: EditProfileDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [website, setWebsite] = useState(profile.website || "");
  const [location, setLocation] = useState(profile.location || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [bannerPreview, setBannerPreview] = useState<string | null>(profile.banner_url);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 524288000) {
        toast.error("Avatar image must be less than 500MB");
        return;
      }
      const isValid = await validateImageFile(file);
      if (!isValid) {
        toast.error("Invalid image file. Please upload a valid JPEG, PNG, GIF, or WebP image.");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 524288000) {
        toast.error("Banner image must be less than 500MB");
        return;
      }
      const isValid = await validateImageFile(file);
      if (!isValid) {
        toast.error("Invalid image file. Please upload a valid JPEG, PNG, GIF, or WebP image.");
        return;
      }
      setBannerFile(file);
      setBannerPreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File, type: 'avatar' | 'banner') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${profile.id}/${type}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError, data } = await supabase.storage
      .from('profiles')
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('profiles')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = profileSchema.parse({ displayName, bio, website, location });
      
      let avatarUrl = profile.avatar_url;
      let bannerUrl = profile.banner_url;

      if (avatarFile) {
        avatarUrl = await uploadImage(avatarFile, 'avatar');
      }

      if (bannerFile) {
        bannerUrl = await uploadImage(bannerFile, 'banner');
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: validatedData.displayName || null,
          bio: validatedData.bio || null,
          website: validatedData.website || null,
          location: validatedData.location || null,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
      onProfileUpdated();
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to update profile");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Banner Upload */}
          <div className="space-y-2">
            <Label>Banner Image</Label>
            <div className="relative">
              <div
                className="h-32 w-full rounded-lg bg-secondary border-2 border-dashed border-border overflow-hidden"
                style={{
                  backgroundImage: bannerPreview ? `url(${bannerPreview})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!bannerPreview && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Upload className="h-8 w-8" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground">Click to upload a banner image (max 5MB)</p>
          </div>

          {/* Avatar Upload */}
          <div className="space-y-2">
            <Label>Profile Picture</Label>
            <div className="relative w-32 h-32 mx-auto">
              <div
                className="w-full h-full rounded-full bg-secondary border-2 border-dashed border-border overflow-hidden"
                style={{
                  backgroundImage: avatarPreview ? `url(${avatarPreview})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {!avatarPreview && (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <Upload className="h-8 w-8" />
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">Click to upload a profile picture (max 5MB)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your display name"
              maxLength={32}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">Max 32 characters</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="min-h-[100px] resize-none"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              disabled={loading}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileDialog;
