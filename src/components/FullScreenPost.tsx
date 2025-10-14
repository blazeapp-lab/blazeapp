import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, ThumbsDown, Repeat2, Eye, User, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CommentSection from "./CommentSection";

interface FullScreenPostProps {
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number;
    broken_hearts_count: number;
    reposts_count: number;
    views_count: number;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  isLiked: boolean;
  isBrokenHearted: boolean;
  isReposted: boolean;
  onLike: () => void;
  onBrokenHeart: () => void;
  onRepost: () => void;
  currentUserId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FullScreenPost = ({
  post,
  isLiked,
  isBrokenHearted,
  isReposted,
  onLike,
  onBrokenHeart,
  onRepost,
  currentUserId,
  open,
  onOpenChange,
}: FullScreenPostProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <div className="p-6 space-y-4">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.profiles.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">
                  {post.profiles.display_name || post.profiles.username}
                </span>
                <span className="text-muted-foreground">
                  @{post.profiles.username}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-3 text-lg whitespace-pre-wrap break-words">{post.content}</p>
            </div>
          </div>

          {post.image_url && (
            <>
              {post.image_url.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
                <video
                  src={post.image_url}
                  controls
                  className="rounded-lg w-full max-h-[500px]"
                />
              ) : (
                <img
                  src={post.image_url}
                  alt="Post media"
                  className="rounded-lg w-full max-h-[500px] object-contain"
                />
              )}
            </>
          )}

          <div className="flex items-center gap-6 pt-4 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={onLike}
            >
              <Heart
                className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
              />
              <span>{post.likes_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={onBrokenHeart}
            >
              <ThumbsDown
                className={`h-5 w-5 ${isBrokenHearted ? "fill-blue-500 text-blue-500" : ""}`}
              />
              <span>{post.broken_hearts_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={onRepost}
            >
              <Repeat2
                className={`h-5 w-5 ${isReposted ? "fill-green-500 text-green-500" : ""}`}
              />
              <span>{post.reposts_count}</span>
            </Button>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-5 w-5" />
              <span>{post.views_count}</span>
            </div>
          </div>

          {currentUserId && (
            <CommentSection postId={post.id} currentUserId={currentUserId} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FullScreenPost;
