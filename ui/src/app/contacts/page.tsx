"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ContactCard } from "@/components/chat/ContactCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
  PhoneIcon,
  MessageCircleIcon,
  MailIcon,
  PencilIcon,
  TrashIcon,
  SaveIcon,
} from "lucide-react";

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  tags: string[];
  lastContacted?: string;
  avatar?: string;
  notes?: string;
  createdAt: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Add form state
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newNotes, setNewNotes] = useState("");

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/contacts");
    const data = await res.json();
    setContacts(data.contacts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const allTags = [...new Set(contacts.flatMap((c) => c.tags))].sort();

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q);
    const matchTag = !tagFilter || c.tags.includes(tagFilter);
    return matchSearch && matchTag;
  });

  const handleAdd = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    await fetch("/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        email: newEmail,
        phone: newPhone || undefined,
        company: newCompany || undefined,
        tags: newTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: newNotes || undefined,
      }),
    });
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewCompany("");
    setNewTags("");
    setNewNotes("");
    setShowAdd(false);
    fetchContacts();
  };

  const startEditing = () => {
    if (!selectedContact) return;
    setEditName(selectedContact.name);
    setEditEmail(selectedContact.email);
    setEditPhone(selectedContact.phone ?? "");
    setEditCompany(selectedContact.company ?? "");
    setEditTags(selectedContact.tags.join(", "));
    setEditNotes(selectedContact.notes ?? "");
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!selectedContact || !editName.trim() || !editEmail.trim()) return;
    const updated = {
      id: selectedContact.id,
      name: editName,
      email: editEmail,
      phone: editPhone || undefined,
      company: editCompany || undefined,
      tags: editTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: editNotes || undefined,
    };
    await fetch("/api/contacts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    setEditing(false);
    await fetchContacts();
    // Update selectedContact with new values
    setSelectedContact((prev) =>
      prev
        ? {
            ...prev,
            name: editName,
            email: editEmail,
            phone: editPhone || undefined,
            company: editCompany || undefined,
            tags: editTags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            notes: editNotes || undefined,
          }
        : null
    );
  };

  const handleDelete = async () => {
    if (!selectedContact) return;
    await fetch("/api/contacts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedContact.id }),
    });
    setSelectedContact(null);
    setEditing(false);
    fetchContacts();
  };

  const handleCloseDetail = (open: boolean) => {
    if (!open) {
      setSelectedContact(null);
      setEditing(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <UsersIcon className="size-6 text-accent" />
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Contacts</h1>
          <Badge variant="secondary" className="text-xs bg-surface-2/60 text-foreground/40 border-0">
            {contacts.length}
          </Badge>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="bg-accent hover:bg-accent/90 text-foreground rounded-xl">
          <PlusIcon className="size-3.5" />
          Add Contact
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/25" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="w-full pl-10 pr-3 py-2.5 bg-surface-2/40 rounded-xl text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/20 placeholder:text-foreground/20 transition-all"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Button
            variant={tagFilter === null ? "default" : "outline"}
            size="sm"
            onClick={() => setTagFilter(null)}
            className={tagFilter === null ? "bg-accent text-foreground rounded-xl" : "rounded-xl border-border text-foreground/40"}
          >
            All
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={tagFilter === tag ? "default" : "outline"}
              size="sm"
              onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
              className={tagFilter === tag ? "bg-accent text-foreground rounded-xl" : "rounded-xl border-border text-foreground/40"}
            >
              {tag}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-2xl shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <UsersIcon className="size-12 mx-auto mb-4 text-foreground/15" />
          <p className="text-lg text-foreground/40">No contacts found</p>
          <p className="text-sm mt-1 text-foreground/20">Add contacts or adjust your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((contact) => (
            <ContactCard
              key={contact.id}
              {...contact}
              onClick={(id) =>
                setSelectedContact(contacts.find((c) => c.id === id) ?? null)
              }
            />
          ))}
        </div>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-[450px] bg-surface-1 border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Full name *"
              className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Email address *"
              className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
            />
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="Phone number"
              className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
            />
            <input
              type="text"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Company"
              className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
            />
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
            />
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Notes"
              rows={3}
              className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={!newName.trim() || !newEmail.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Dialog */}
      <Dialog
        open={!!selectedContact}
        onOpenChange={handleCloseDetail}
      >
        <DialogContent className="sm:max-w-[450px] bg-surface-1 border-border">
          {selectedContact && !editing && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-foreground">
                    {selectedContact.name}
                  </DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditing}
                    className="text-foreground/40 hover:text-foreground"
                  >
                    <PencilIcon className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </DialogHeader>

              {/* Action buttons */}
              <div className="flex gap-2">
                {selectedContact.phone && (
                  <>
                    <a href={`tel:${selectedContact.phone}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl border-border text-foreground/60 hover:text-foreground hover:border-accent/30"
                      >
                        <PhoneIcon className="size-3.5" />
                        Call
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/sms?phone=${encodeURIComponent(selectedContact.phone!)}`)}
                      className="rounded-xl border-border text-foreground/60 hover:text-foreground hover:border-accent/30"
                    >
                      <MessageCircleIcon className="size-3.5" />
                      Text
                    </Button>
                  </>
                )}
                {selectedContact.email && (
                  <a href={`mailto:${selectedContact.email}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-border text-foreground/60 hover:text-foreground hover:border-accent/30"
                    >
                      <MailIcon className="size-3.5" />
                      Email
                    </Button>
                  </a>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-foreground/40">Email: </span>
                    <span className="text-foreground/80">{selectedContact.email}</span>
                  </div>
                  {selectedContact.phone && (
                    <div className="text-sm">
                      <span className="text-foreground/40">Phone: </span>
                      <span className="text-foreground/80">{selectedContact.phone}</span>
                    </div>
                  )}
                  {selectedContact.company && (
                    <div className="text-sm">
                      <span className="text-foreground/40">Company: </span>
                      <span className="text-foreground/80">{selectedContact.company}</span>
                    </div>
                  )}
                  {selectedContact.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {selectedContact.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs bg-surface-2/60 text-foreground/50 border-0">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {selectedContact.notes && (
                    <div className="text-sm">
                      <span className="text-foreground/40">Notes: </span>
                      <span className="text-foreground/80">{selectedContact.notes}</span>
                    </div>
                  )}
                  <div className="text-xs text-foreground/25">
                    Added: {new Date(selectedContact.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Delete button */}
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <TrashIcon className="size-3.5" />
                    Delete Contact
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Edit mode */}
          {selectedContact && editing && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-foreground">Edit Contact</DialogTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEditing}
                    className="text-foreground/40 hover:text-foreground"
                  >
                    <XIcon className="size-3.5" />
                    Cancel
                  </Button>
                </div>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Full name *"
                  className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
                />
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Email address *"
                  className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
                />
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
                />
                <input
                  type="text"
                  value={editCompany}
                  onChange={(e) => setEditCompany(e.target.value)}
                  placeholder="Company"
                  className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
                />
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20"
                />
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes"
                  rows={3}
                  className="w-full bg-surface-2/40 rounded-xl px-3 py-2.5 text-sm text-foreground border border-border focus:outline-none focus:ring-1 focus:ring-accent/30 placeholder:text-foreground/20 resize-none"
                />
                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDelete}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <TrashIcon className="size-3.5" />
                    Delete
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!editName.trim() || !editEmail.trim()}
                    className="bg-accent hover:bg-accent/90 text-foreground rounded-xl"
                  >
                    <SaveIcon className="size-3.5" />
                    Save
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
