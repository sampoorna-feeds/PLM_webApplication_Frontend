"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, Send, Package, Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ItemSelect } from "@/components/forms/transfer-orders/item-select";
import { LocationSelect } from "@/components/forms/shared/location-select";
import { DimensionSelect } from "@/components/forms/dimension-select";
import { CascadingDimensionSelect } from "@/components/forms/cascading-dimension-select";
import { useAuth } from "@/lib/contexts/auth-context";
import {
  createConsumeInventoryEntry,
  postConsumeInventory,
  getConsumeInventoryEntries,
  type ConsumeInventoryEntry,
} from "@/lib/api/services/consume-inventory.service";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ConsumeInventoryForm() {
  const { userID } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<ConsumeInventoryEntry[]>([]);
  const [formState, setFormState] = useState<Partial<ConsumeInventoryEntry>>({
    "Posting Date": new Date().toISOString().split("T")[0],
    "Entry Type": "Issue",
    "Document No.": "",
    "Item No.": "",
    Description: "",
    "Location Code": "",
    Quantity: 0,
    "Unit of Measure Code": "",
    "Lob Code": "",
    "Branch Code": "",
    "Employee Code": "",
    "Assignment Code": "",
  });

  useEffect(() => {
    if (userID) {
      loadEntries();
    }
  }, [userID]);

  const loadEntries = async () => {
    if (!userID) return;
    setLoading(true);
    try {
      const data = await getConsumeInventoryEntries(userID);
      setEntries(data);
    } catch (error) {
      console.error("Error loading entries:", error);
      toast.error("Failed to load entries");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ConsumeInventoryEntry, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddEntry = async () => {
    if (!formState["Item No."] || !formState["Location Code"] || !formState.Quantity) {
      toast.error("Please fill in Item, Location and Quantity");
      return;
    }

    setSubmitting(true);
    try {
      const payload = { ...formState, UserID: userID };
      await createConsumeInventoryEntry(payload);
      toast.success("Entry added to pending list");
      setFormState((prev) => ({
        ...prev,
        "Item No.": "",
        Description: "",
        Quantity: 0,
        "Unit of Measure Code": "",
      }));
      loadEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to add entry");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (entries.length === 0) {
      toast.error("No entries to post");
      return;
    }

    if (!confirm("Are you sure you want to post these entries?")) return;

    setSubmitting(true);
    try {
      const result = await postConsumeInventory(userID!);
      toast.success(result || "Posted successfully");
      loadEntries();
    } catch (error: any) {
      toast.error(error.message || "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Card className="border-none shadow-2xl bg-gradient-to-br from-background via-background to-primary/5 border border-primary/10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  New Consumption Entry
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">Add items to the pending list for posting</p>
              </div>
            </div>
            {submitting && <Badge variant="secondary" className="animate-pulse bg-primary/10 text-primary border-none">Processing...</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Posting Date</label>
              <DateInput
                value={formState["Posting Date"]}
                onChange={(v) => handleChange("Posting Date", v)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Entry Type</label>
              <Select
                value={formState["Entry Type"]}
                onValueChange={(v) => handleChange("Entry Type", v)}
              >
                <SelectTrigger className="h-10 shadow-sm transition-all focus:ring-1">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Issue">Issue</SelectItem>
                  <SelectItem value="Return">Return</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Document No.</label>
              <Input
                className="h-10 shadow-sm focus:ring-1"
                value={formState["Document No."]}
                onChange={(e) => handleChange("Document No.", e.target.value)}
                placeholder="e.g. CNS-001"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Location</label>
              <LocationSelect
                value={formState["Location Code"] || ""}
                onChange={(v) => handleChange("Location Code", v)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Item Selection</label>
              <ItemSelect
                value={formState["Item No."] || ""}
                onChange={(v, item) => {
                  handleChange("Item No.", v);
                  if (item) {
                    handleChange("Description", item.Description);
                    handleChange("Unit of Measure Code", item.Base_Unit_of_Measure);
                  }
                }}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Quantity</label>
              <Input
                type="number"
                className="h-10 font-mono font-bold text-primary shadow-sm focus:ring-1 text-lg"
                value={formState.Quantity}
                onChange={(e) => handleChange("Quantity", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">UOM</label>
              <Input
                className="h-10 bg-muted/50 border-dashed font-medium"
                value={formState["Unit of Measure Code"]}
                disabled
                placeholder="Auto-filled"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">LOB</label>
              <CascadingDimensionSelect
                dimensionType="LOB"
                value={formState["Lob Code"] || ""}
                onChange={(v) => handleChange("Lob Code", v)}
                userId={userID ?? undefined}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Branch</label>
              <CascadingDimensionSelect
                dimensionType="BRANCH"
                value={formState["Branch Code"] || ""}
                onChange={(v) => handleChange("Branch Code", v)}
                lobValue={formState["Lob Code"]}
                userId={userID ?? undefined}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Employee</label>
              <DimensionSelect
                dimensionType="EMPLOYEE"
                value={formState["Employee Code"] || ""}
                onChange={(v) => handleChange("Employee Code", v)}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Assignment</label>
              <DimensionSelect
                dimensionType="ASSIGNMENT"
                value={formState["Assignment Code"] || ""}
                onChange={(v) => handleChange("Assignment Code", v)}
                className="h-10"
              />
            </div>
          </div>
          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleAddEntry}
              disabled={submitting}
              className="px-10 h-11 font-bold"
            >
              {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Plus className="mr-2 h-5 w-5" />}
              Add to List
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-2xl bg-background/40 backdrop-blur-xl border border-border/50 flex-1 min-h-[500px] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-5 px-6 border-b bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Info className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight">
                Pending List
              </CardTitle>
              <p className="text-xs text-muted-foreground font-medium">{entries.length} items ready for posting</p>
            </div>
          </div>
          <Button
            variant="default"
            size="lg"
            onClick={handlePost}
            disabled={submitting || entries.length === 0}
            className="font-bold px-8"
          >
            {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            Post Consumption
          </Button>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow className="hover:bg-transparent border-b-2">
                <TableHead className="w-[140px] font-bold text-xs uppercase tracking-wider py-4">Posting Date</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-4">Document</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-4">Item Details</TableHead>
                <TableHead className="font-bold text-xs uppercase tracking-wider py-4">Location</TableHead>
                <TableHead className="text-right font-bold text-xs uppercase tracking-wider py-4">Quantity</TableHead>
                <TableHead className="w-[80px] py-4"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                      <p className="text-sm font-medium">Fetching pending entries...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-64 text-center">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                      <Package className="h-16 w-16 opacity-20" />
                      <p className="text-base font-medium italic">No entries in the pending list</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                entries.map((entry, index) => (
                  <TableRow key={index} className="group hover:bg-primary/[0.03] transition-colors border-b last:border-none">
                    <TableCell className="font-medium text-sm">{entry["Posting Date"]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px] bg-background">
                        {entry["Document No."] || "N/A"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-sm text-foreground">{entry["Item No."]}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[250px]">{entry.Description}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[11px]">
                        {entry["Location Code"]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-mono font-black text-primary text-base">
                          {entry.Quantity?.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">{entry["Unit of Measure Code"]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
