import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface QuotedPostProps {
  quotedPost: {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    profiles: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
  };
}

const QuotedPost = ({ quotedPost }: QuotedPostProps) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/post/${quotedPost.id}`);
  };

  return (
    <Card 
      className="mt-3 p-3 bg-secondary/30 border-2 hover:bg-secondary/50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex items-start gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={quotedPost.profiles.avatar_url || undefined} />
          <AvatarFallback>
            <User className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">
              {quotedPost.profiles.display_name || quotedPost.profiles.username}
            </span>
            <span className="text-xs text-muted-foreground">
              @{quotedPost.profiles.username}
            </span>
            <span className="text-xs text-muted-foreground">
              · {formatDistanceToNow(new Date(quotedPost.created_at), { addSuffix: true })}
            </span>
          </div>
          <p className="text-sm mt-1 line-clamp-3 whitespace-pre-wrap break-words">{quotedPost.content}</p>
          {quotedPost.image_url && (
            <>
              {quotedPost.image_url.match(/\.(mp4|webm|mov|quicktime)$/i) ? (
                <video
                  src={quotedPost.image_url}
                  controls
                  className="mt-2 rounded max-h-48 w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <img
                  src={quotedPost.image_url}
                  alt="Quoted post media"
                  className="mt-2 rounded max-h-48 w-full object-cover"
                />
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QuotedPost;
