import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getWorkspace, saveNote, deleteNote } from "@/lib/track.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, StickyNote, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "Notes — CyberTrack" },
      {
        name: "description",
        content: "Save commands, lab evidence and learning reminders in your private CyberTrack notes.",
      },
      { property: "og:title", content: "Notes — CyberTrack" },
      { property: "og:description", content: "Save commands, lab evidence and learning reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesPage,
});

type Note = { id: string; title: string; content: string; updated_at: string };

function NotesPage() {
  const getWs = useServerFn(getWorkspace);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["workspace"], queryFn: () => getWs() });

  const [search, setSearch] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [deleting, setDeleting] = useState<Note | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["workspace"] });

  const saveFn = useServerFn(saveNote);
  const deleteFn = useServerFn(deleteNote);

  const saveMutation = useMutation({
    mutationFn: (vars: { id?: string; title: string; content: string }) => saveFn({ data: vars }),
    onSuccess: () => {
      toast.success("Note saved");
      setEditorOpen(false);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to save note"),
  });

  const deleteMutation = useMutation({
    mutationFn: (vars: { id: string }) => deleteFn({ data: vars }),
    onSuccess: () => {
      toast.success("Note deleted");
      setDeleting(null);
      refresh();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to delete note"),
  });

  if (error) {
    return <p className="py-20 text-center text-sm text-destructive">{(error as Error).message}</p>;
  }
  if (isLoading || !data) {
    return <p className="py-20 text-center font-display text-xs tracking-widest text-primary">LOADING NOTES…</p>;
  }

  const q = search.trim().toLowerCase();
  const notes = data.notes.filter(
    (n) => !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
  );

  function openNew() {
    setEditing(null);
    setTitle("");
    setContent("");
    setEditorOpen(true);
  }

  function openEdit(n: Note) {
    setEditing(n);
    setTitle(n.title);
    setContent(n.content);
    setEditorOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl tracking-wide">Notes</h1>
          <p className="text-sm text-muted-foreground">Your commands, lab evidence, and learning reminders</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" /> New note
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <StickyNote className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {q ? "No notes match your search." : "No notes yet. Save commands, lab evidence, and questions here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <Card key={n.id} className="group flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug">{n.title || "Untitled note"}</h3>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(n)} aria-label="Edit note">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleting(n)} aria-label="Delete note">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="flex-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                  {n.content.slice(0, 220) || "—"}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {new Date(n.updated_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit note" : "New note"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                placeholder="e.g. Nmap basics / phishing email #3"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note-content">Note</Label>
              <Textarea
                id="note-content"
                rows={8}
                placeholder="Commands used, findings, evidence, questions…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={saveMutation.isPending}
              onClick={() =>
                saveMutation.mutate(
                  editing ? { id: editing.id, title, content } : { title, content },
                )
              }
            >
              {saveMutation.isPending ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete note?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            "{deleting?.title || "Untitled note"}" will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleting && deleteMutation.mutate({ id: deleting.id })}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
