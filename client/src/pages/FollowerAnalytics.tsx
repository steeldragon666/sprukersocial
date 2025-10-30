import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, UserPlus, TrendingUp, Activity } from "lucide-react";

export default function FollowerAnalytics() {
  const { user, loading: authLoading } = useAuth();

  const { data: status, isLoading: statusLoading } = trpc.instagram.getStatus.useQuery();
  const { data: followedAccounts, isLoading: accountsLoading } = trpc.instagram.getFollowedAccounts.useQuery();
  const { data: activity } = trpc.instagram.getActivity.useQuery();

  if (authLoading || statusLoading || accountsLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const followActivity = activity?.filter(a => a.actionType === "follow") || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Follower Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track your follower growth and engagement metrics
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Followed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.followStats.total || 0}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Currently Following</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{status?.followStats.following || 0}</div>
              <p className="text-xs text-muted-foreground">Active follows</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Follow Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{followActivity.length}</div>
              <p className="text-xs text-muted-foreground">Total actions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {followActivity.length > 0
                  ? Math.round((followActivity.filter(a => a.status === "success").length / followActivity.length) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Follow success</p>
            </CardContent>
          </Card>
        </div>

        {/* Followed Accounts List */}
        <Card>
          <CardHeader>
            <CardTitle>Followed Accounts</CardTitle>
            <CardDescription>Accounts you're currently following through automation</CardDescription>
          </CardHeader>
          <CardContent>
            {followedAccounts && followedAccounts.length > 0 ? (
              <div className="space-y-3">
                {followedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.username}</p>
                        <p className="text-sm text-muted-foreground">
                          Followed {new Date(account.followedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">

                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          account.status === "following"
                            ? "bg-green-500/10 text-green-500"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {account.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No followed accounts yet</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Start automation to begin following relevant accounts
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>Follow Activity</CardTitle>
            <CardDescription>Recent follow actions and their results</CardDescription>
          </CardHeader>
          <CardContent>
            {followActivity.length > 0 ? (
              <div className="space-y-2">
                {followActivity.slice(0, 20).map((log) => {
                  let details;
                  try {
                    details = JSON.parse(log.actionDetails || "{}");
                  } catch {
                    details = {};
                  }

                  return (
                    <div key={log.id} className="flex items-center justify-between p-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            Followed {details.count || 0} account(s)
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {details.hashtag && `via #${details.hashtag}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            log.status === "success"
                              ? "bg-green-500/10 text-green-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No follow activity yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
