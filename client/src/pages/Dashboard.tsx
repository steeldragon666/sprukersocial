import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Activity, Calendar, Play, Pause, TrendingUp, Users, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: status, isLoading, refetch } = trpc.instagram.getStatus.useQuery();
  const { data: posts } = trpc.instagram.getPosts.useQuery();
  const { data: activity } = trpc.instagram.getActivity.useQuery();

  const toggleAutomation = trpc.instagram.toggleAutomation.useMutation({
    onSuccess: () => {
      toast.success(status?.account?.isActive ? "Automation paused" : "Automation started");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const generatePost = trpc.instagram.generatePost.useMutation({
    onSuccess: (data) => {
      toast.success("Post generated and scheduled!");
      setIsGenerating(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsGenerating(false);
    },
  });

  const handleToggleAutomation = () => {
    if (!status?.account) {
      toast.error("No Instagram account configured");
      return;
    }
    toggleAutomation.mutate({ isActive: !status.account.isActive });
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Instagram Automation</h1>
            <p className="text-muted-foreground mt-1">
              Manage your automated Instagram content for PowerPlant Energy
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGeneratePost}
              disabled={isGenerating || !status?.account}
              variant="outline"
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate Post"}
            </Button>
            <Button
              onClick={handleToggleAutomation}
              disabled={!status?.account}
              variant={status?.account?.isActive ? "destructive" : "default"}
            >
              {status?.account?.isActive ? (
                <>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause Automation
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Start Automation
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Account Status */}
        {status?.account && (
          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>@{status.account.username}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    status.account.isActive ? "bg-green-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-sm font-medium">
                  {status.account.isActive ? "Active" : "Paused"}
                </span>
                {status.account.lastPostAt && (
                  <span className="text-sm text-muted-foreground ml-4">
                    Last post: {new Date(status.account.lastPostAt).toLocaleString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.postStats.total || 0}</div>
              <p className="text-xs text-muted-foreground">
                {status?.postStats.posted || 0} posted, {status?.postStats.scheduled || 0} scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Following</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.followStats.following || 0}</div>
              <p className="text-xs text-muted-foreground">
                {status?.followStats.total || 0} total accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
              <p className="text-xs text-muted-foreground">Analytics coming soon</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Posts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>Your latest scheduled and posted content</CardDescription>
          </CardHeader>
          <CardContent>
            {posts && posts.length > 0 ? (
              <div className="space-y-4">
                {posts.slice(0, 5).map((post) => (
                  <div key={post.id} className="flex items-start gap-4 border-b pb-4 last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            post.status === "posted"
                              ? "bg-green-500/10 text-green-500"
                              : post.status === "scheduled"
                              ? "bg-blue-500/10 text-blue-500"
                              : post.status === "failed"
                              ? "bg-red-500/10 text-red-500"
                              : "bg-gray-500/10 text-gray-500"
                          }`}
                        >
                          {post.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {post.scheduledFor
                            ? new Date(post.scheduledFor).toLocaleString()
                            : "No schedule"}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      {post.hashtags && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {JSON.parse(post.hashtags).slice(0, 5).join(" ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No posts yet. Generate your first post!</p>
            )}
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent automation actions</CardDescription>
          </CardHeader>
          <CardContent>
            {activity && activity.length > 0 ? (
              <div className="space-y-2">
                {activity.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{log.actionType}</span>
                    <span className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    {log.status === "failed" && (
                      <span className="text-red-500 text-xs">(failed)</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
