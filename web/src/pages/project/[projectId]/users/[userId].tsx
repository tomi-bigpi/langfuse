import { useRouter } from "next/router";
import Header from "@/src/components/layouts/header";
import { api } from "@/src/utils/api";
import TracesTable from "@/src/components/table/use-cases/traces";
import ScoresTable from "@/src/components/table/use-cases/scores";
import { compactNumberFormatter, usdFormatter } from "@/src/utils/numbers";
import { GroupedScoreBadges } from "@/src/components/grouped-score-badge";
import TableLink from "@/src/components/table/table-link";
import { StringParam, useQueryParam, withDefault } from "use-query-params";
import { DetailPageNav } from "@/src/features/navigate-detail-pages/DetailPageNav";
import SessionsTable from "@/src/components/table/use-cases/sessions";

const tabs = ["Overview", "Sessions", "Traces", "Scores"] as const;

export default function UserPage() {
  const router = useRouter();
  const userId = decodeURIComponent(router.query.userId as string);
  const projectId = router.query.projectId as string;

  const [currentTab, setCurrentTab] = useQueryParam(
    "tab",
    withDefault(StringParam, tabs[0]),
  );

  function classNames(...classes: string[]) {
    return classes.filter(Boolean).join(" ");
  }

  const renderTabContent = () => {
    switch (currentTab as (typeof tabs)[number]) {
      case "Overview":
        return <OverviewTab userId={userId} projectId={projectId} />;
      case "Sessions":
        return <SessionsTab userId={userId} projectId={projectId} />;
      case "Traces":
        return <TracesTab userId={userId} projectId={projectId} />;
      case "Scores":
        return <ScoresTab userId={userId} projectId={projectId} />;
      default:
        return null;
    }
  };

  const handleTabChange = async (tab: string) => {
    if (router.query.filter || router.query.orderBy) {
      const newQuery = { ...router.query };
      delete newQuery.filter;
      delete newQuery.orderBy;
      await router.replace({ query: newQuery });
    }
    setCurrentTab(tab);
  };

  return (
    <div>
      <Header
        title="User Detail"
        breadcrumb={[
          { name: "Users", href: `/project/${projectId}/users` },
          { name: userId },
        ]}
        actionButtons={
          <DetailPageNav
            currentId={encodeURIComponent(userId)}
            path={(entry) =>
              `/project/${projectId}/users/${encodeURIComponent(entry.id)}`
            }
            listKey="users"
          />
        }
      />

      <div>
        <div className="sm:hidden">
          <label htmlFor="tabs" className="sr-only">
            Select a tab
          </label>
          <select
            id="tabs"
            name="tabs"
            className="block w-full rounded-md border-border py-2 pl-3 pr-10 text-base focus:outline-none sm:text-sm"
            defaultValue={currentTab}
            onChange={(e) => handleTabChange(e.currentTarget.value)}
          >
            {tabs.map((tab) => (
              <option key={tab}>{tab}</option>
            ))}
          </select>
        </div>
        <div className="hidden sm:block">
          <div className="border-b border-border">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  className={classNames(
                    tab === currentTab
                      ? "border-primary-accent text-primary-accent"
                      : "border-transparent text-muted-foreground hover:border-border hover:text-primary",
                    "whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium",
                  )}
                  aria-current={tab === currentTab ? "page" : undefined}
                  onClick={() => handleTabChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>
        </div>
        {renderTabContent()}
      </div>
    </div>
  );
}

type TabProps = {
  userId: string;
  projectId: string;
};

function OverviewTab({ userId, projectId }: TabProps) {
  const user = api.users.byId.useQuery({ projectId: projectId, userId });

  const userData: { value: string; label: string }[] = user.data
    ? [
        { label: "User Id", value: user.data.userId },
        {
          label: "First Observation",
          value: user.data.firstObservation?.toLocaleString(),
        },
        {
          label: "Last Observation",
          value: user.data.lastObservation?.toLocaleString(),
        },
        {
          label: "Total Observations",
          value: compactNumberFormatter(user.data.totalObservations),
        },
        {
          label: "Total Traces",
          value: compactNumberFormatter(user.data.totalTraces),
        },
        {
          label: "Prompt Tokens",
          value: compactNumberFormatter(user.data.totalPromptTokens),
        },
        {
          label: "Completion Tokens",
          value: compactNumberFormatter(user.data.totalCompletionTokens),
        },
        {
          label: "Total Tokens",
          value: compactNumberFormatter(user.data.totalTokens),
        },
        {
          label: "Total Cost",
          value: usdFormatter(user.data.sumCalculatedTotalCost),
        },
      ]
    : [];

  return (
    <div className="mt-6 border-t border-muted">
      <dl className="divide-y divide-muted">
        {userData.map((item) => (
          <div
            key={item.label}
            className="px-4 py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
          >
            <dt className="text-sm font-medium leading-6 text-primary">
              {item.label}
            </dt>
            <dd className="mt-1 text-xs leading-6 text-primary sm:col-span-2 sm:mt-0">
              {item.value ?? "-"}
            </dd>
          </div>
        ))}
        {user.data?.lastScore ? (
          <div
            key="score"
            className="px-4 py-3 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
          >
            <dt className="text-sm font-medium leading-6 text-primary">
              Last Score
            </dt>
            <dd className="mt-1 text-xs leading-6 text-primary sm:col-span-2 sm:mt-0">
              <div className="flex items-center gap-4">
                <TableLink
                  path={
                    user.data.lastScore.observationId
                      ? `/project/${projectId}/traces/${encodeURIComponent(user.data.lastScore.traceId)}?observation=${encodeURIComponent(user.data.lastScore.observationId)}`
                      : `/project/${projectId}/traces/${encodeURIComponent(user.data.lastScore.traceId)}`
                  }
                  value={user.data.lastScore.traceId}
                />
                <GroupedScoreBadges scores={[user.data.lastScore]} />
              </div>
            </dd>
          </div>
        ) : undefined}
      </dl>
    </div>
  );
}

function ScoresTab({ userId, projectId }: TabProps) {
  return (
    <ScoresTable
      projectId={projectId}
      userId={userId}
      omittedFilter={["User ID"]}
    />
  );
}

function TracesTab({ userId, projectId }: TabProps) {
  return (
    <TracesTable
      projectId={projectId}
      userId={userId}
      omittedFilter={["User ID"]}
    />
  );
}

function SessionsTab({ userId, projectId }: TabProps) {
  return (
    <SessionsTable
      projectId={projectId}
      userId={userId}
      omittedFilter={["User IDs"]}
    />
  );
}
