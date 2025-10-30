import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Calendar, Image as ImageIcon, Hash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ScheduledPosts() {
  const { user, loading: authLoading } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: posts, isLoading, refetch } = trpc.instagram.getPosts.useQuery();

  const generatePost = trpc.instagram.generatePost.useMutation({
    onSuccess: () => {
      toast.success("New post generated and scheduled!");
      setIsGenerating(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsGenerating(false);
    },
  });

  const handleGeneratePost = () => {
    setIsGenerating(true);
    generatePost.mutate({});
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const scheduledPosts = posts?.filter(p => p.status === "scheduled") || [];
  const postedPosts = posts?.filter(p => p.status === "posted") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Scheduled Posts</h1>
            <p className="text-muted-foreground mt-1">
              View and manage your Instagram content queue
            </p>
          </div>
          <Button
            onClick={handleGeneratePost}
            disabled={isGenerating}
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate New Post"}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scheduledPosts.length}</div>
              <p className="text-xs text-muted-foreground">Waiting to post</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Posted</CardTitle>
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{postedPosts.length}</div>
              <p className="text-xs text-muted-foreground">Successfully published</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Hash className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{posts?.length || 0}</div>
              <p className="text-xs text-muted-foreground">All posts</p>
            </CardContent>
          </Card>
        </div>

        {/* Scheduled Posts List */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Posts</CardTitle>
            <CardDescription>Posts scheduled to be published automatically</CardDescription>
          </CardHeader>
          <CardContent>
            {scheduledPosts.length > 0 ? (
              <div className="space-y-6">
                {scheduledPosts.map((post) => {
                  const hashtags = post.hashtags ? JSON.parse(post.hashtags) : [];
                  
                  return (
                    <div key={post.id} className="border rounded-lg p-4 space-y-3">
                      {/* Header with status and time */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-500">
                          Scheduled
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {post.scheduledFor
                            ? new Date(post.scheduledFor).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : "No schedule"}
                        </span>
                      </div>

                      {/* Image */}
                      {post.imageUrl && (
                        <div className="rounded-lg overflow-hidden bg-muted">
                          <img
                            src={post.imageUrl}
                            alt="Post preview"
                            className="w-full h-64 object-cover"
                          />
                        </div>
                      )}

                      {/* Caption */}
                      <div className="space-y-2">
                        <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                      </div>

                      {/* Hashtags */}
                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hashtags.map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No scheduled posts</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Generate your first post to start automating your Instagram content
                </p>
                <Button onClick={handleGeneratePost} className="mt-4" disabled={isGenerating}>
                  Generate Post
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Posted History */}
        {postedPosts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recently Posted</CardTitle>
              <CardDescription>Your published Instagram content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {postedPosts.slice(0, 5).map((post) => {
                  const hashtags = post.hashtags ? JSON.parse(post.hashtags) : [];
                  
                  return (
                    <div key={post.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">
                          Posted
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {post.postedAt
                            ? new Date(post.postedAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })
                            : "Unknown"}
                        </span>
                      </div>

                      {post.imageUrl && (
                        <div className="rounded-lg overflow-hidden bg-muted">
                          <img
                            src={post.imageUrl}
                            alt="Post preview"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}

                      <p className="text-sm line-clamp-3">{post.content}</p>

                      {hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {hashtags.slice(0, 8).map((tag: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 rounded bg-primary/10 text-primary"
                            >
                              {tag}
                            </span>
                          ))}
                          {hashtags.length > 8 && (
                            <span className="text-xs px-2 py-1 text-muted-foreground">
                              +{hashtags.length - 8} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
