import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, User, Repeat2, Eye, ThumbsDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import CommentSection from "./CommentSection";
import { parseMentions } from "@/lib/mentionUtils";

interface FullScreenPostProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    id: string;
    content: string;
    image_url: string | null;
    likes_count: number;
    comments_count: number;
    broken_hearts_count: number;
    reposts_count: number;
    views_count: number;
    created_at: string;
    user_id: string;
    profiles: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
  currentUserId: string | undefined;
  isLiked: boolean;
  isBrokenHearted: boolean;
  isReposted: boolean;
  onLike: () => void;
  onBrokenHeart: () => void;
  onRepost: () => void;
}

const FullScreenPost = ({
  open,
  onOpenChange,
  post,
  currentUserId,
  isLiked,
  isBrokenHearted,
  isReposted,
  onLike,
  onBrokenHeart,
  onRepost,
}: FullScreenPostProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-2">
          <div className="flex items-start gap-2.5">
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.profiles.avatar_url || undefined} />
              <AvatarFallback>
                <User className="h-3.5 w-3.5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold">
                  {post.profiles.display_name || post.profiles.username}
                </span>
                <span className="text-xs text-muted-foreground">
                  @{post.profiles.username}
                </span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-1.5 text-sm whitespace-pre-wrap break-words">
                {parseMentions(post.content)}
              </p>
              {post.image_url && (
                <>
                  {post.image_url.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
                    <video
                      src={post.image_url}
                      controls
                      className="mt-2 rounded-lg max-h-80 w-full"
                    />
                  ) : (
                    <img
                      src={post.image_url}
                      alt="Post media"
                      className="mt-2 rounded-lg max-h-80 w-full object-cover"
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start sm:gap-2 pt-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="gap-0.5 h-7 px-1.5 min-w-0"
              onClick={onLike}
            >
              <Heart
                className={`h-3.5 w-3.5 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
              />
              <span className="text-xs">{post.likes_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-0.5 h-7 px-1.5 min-w-0"
              onClick={onBrokenHeart}
            >
              <ThumbsDown
                className={`h-3.5 w-3.5 ${isBrokenHearted ? "fill-blue-500 text-blue-500" : ""}`}
              />
              <span className="text-xs">{post.broken_hearts_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-0.5 h-7 px-1.5 min-w-0"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-xs">{post.comments_count}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-0.5 h-7 px-1.5 min-w-0"
              onClick={onRepost}
            >
              <Repeat2
                className={`h-3.5 w-3.5 ${isReposted ? "fill-green-500 text-green-500" : ""}`}
              />
              <span className="text-xs">{post.reposts_count}</span>
            </Button>
            <div className="flex items-center gap-0.5 text-muted-foreground text-xs px-1.5">
              <Eye className="h-3.5 w-3.5" />
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
