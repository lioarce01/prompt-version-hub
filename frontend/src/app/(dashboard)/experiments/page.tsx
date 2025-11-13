"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetExperimentsQuery } from "@/hooks/useExperiments";
import { ExperimentCard } from "@/components/experiments/ExperimentCard";
import { CreateExperimentModal } from "@/components/experiments/CreateExperimentModal";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExperimentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterTab, setFilterTab] = useState<"my" | "all">("my");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data: experiments, isLoading } = useGetExperimentsQuery(
    filterTab === "all",
  );

  const filteredExperiments = Array.isArray(experiments)
    ? experiments.filter((exp) => {
        const matchesSearch = exp.prompt_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
        const matchesFilter = filterTab === "all" ? true : exp.is_owner;

        return matchesSearch && matchesFilter;
      })
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Experiments
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            A/B test different prompt versions with weighted distribution
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Experiment
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search experiments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs
          value={filterTab}
          onValueChange={(v) => setFilterTab(v as "my" | "all")}
        >
          <TabsList>
            <TabsTrigger value="my">My Experiments</TabsTrigger>
            <TabsTrigger value="all">All (including public)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Experiments Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filteredExperiments && filteredExperiments.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExperiments.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm font-medium text-foreground">
            {searchQuery
              ? "No experiments found matching your search"
              : filterTab === "my"
                ? "You haven't created any experiments yet"
                : "No experiments available"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filterTab === "my" &&
              !searchQuery &&
              "Create your first A/B test experiment to compare prompt variants"}
          </p>
          {filterTab === "my" && !searchQuery && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Create Experiment
            </Button>
          )}
        </div>
      )}

      {/* Create Modal */}
      <CreateExperimentModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
