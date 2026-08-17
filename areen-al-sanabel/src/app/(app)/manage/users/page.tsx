"use client";

import { useState } from "react";
import useSWR from "swr";

import {
  IconEdit,
  IconKey,
  IconTroop,
  IconTroopAdd,
} from "@/components/icons";
import { RoleBadge } from "@/components/status";
import { useSessionUser } from "@/components/session";
import { useToast } from "@/components/toast";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
} from "@/components/ui";
import { apiPatch, apiPost, errorMessage } from "@/lib/client";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/domain";
import { formatDate } from "@/lib/format";
import type { UserDto } from "@/lib/types";

type UserForm = {
  username: string;
  fullName: string;
  password: string;
  role: Role;
  teamName: string;
};

const emptyForm: UserForm = {
  username: "",
  fullName: "",
  password: "",
  role: "TEAM_LEADER",
  teamName: "",
};

export default function ManageUsersPage() {
  const currentUser = useSessionUser();
  const toast = useToast();
  const { data, error, isLoading, mutate } = useSWR<{ users: UserDto[] }>("/api/users");

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserDto | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<UserDto | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const users = data?.users ?? [];

  function openCreate() {
    setForm(emptyForm);
    setCreating(true);
  }

  function openEdit(user: UserDto) {
    setForm({
      username: user.username,
      fullName: user.fullName,
      password: "",
      role: user.role as Role,
      teamName: user.teamName ?? "",
    });
    setEditing(user);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await apiPatch(`/api/users/${editing.id}`, {
          fullName: form.fullName.trim(),
          role: form.role,
          teamName: form.role === "TEAM_LEADER" ? form.teamName.trim() : undefined,
        });
        toast.success(`حُدّث حساب «${form.fullName.trim()}»`);
      } else {
        await apiPost("/api/users", {
          username: form.username.trim(),
          fullName: form.fullName.trim(),
          password: form.password,
          role: form.role,
          teamName: form.role === "TEAM_LEADER" ? form.teamName.trim() : undefined,
        });
        toast.success(`أُنشئ حساب «${form.fullName.trim()}»`);
      }
      setCreating(false);
      setEditing(null);
      void mutate();
    } catch (caught) {
      toast.error(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(user: UserDto) {
    try {
      await apiPatch(`/api/users/${user.id}`, { isActive: !user.isActive });
      toast.success(user.isActive ? "عُطّل الحساب" : "فُعّل الحساب");
      void mutate();
    } catch (caught) {
      toast.error(errorMessage(caught));
    }
  }

  return (
    <div>
      <PageHeader
        title="إدارة الحسابات"
        action={
          <Button size="sm" onClick={openCreate}>
            <IconTroopAdd className="size-4" />
            حساب جديد
          </Button>
        }
      />

      {error && <ErrorBlock message={errorMessage(error)} />}
      {isLoading && !data && <LoadingBlock />}

      {data && users.length === 0 && (
        <Card>
          <EmptyState icon={<IconTroop className="size-6" />} title="لا توجد حسابات" />
        </Card>
      )}

      {users.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead>
                <tr className="border-b border-sand-200 bg-sand-50 text-xs text-ink-400">
                  <th className="px-4 py-3 text-start font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-start font-semibold">اسم الدخول</th>
                  <th className="px-4 py-3 text-start font-semibold">الدور</th>
                  <th className="px-4 py-3 text-start font-semibold">الفرقة</th>
                  <th className="px-4 py-3 text-start font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-end font-semibold">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-200">
                {users.map((user) => (
                  <tr key={user.id} className={user.isActive ? "" : "bg-sand-50 opacity-70"}>
                    <td className="px-4 py-3">
                      <span className="font-bold text-ink-900">{user.fullName}</span>
                      {user.id === currentUser.id && (
                        <span className="ms-2 text-xs font-semibold text-forest-600">(أنت)</span>
                      )}
                      <span className="mt-0.5 block text-xs text-ink-400">
                        أُنشئ في {formatDate(user.createdAt)}
                      </span>
                    </td>
                    <td dir="ltr" className="px-4 py-3 text-start font-mono text-xs text-ink-500">
                      {user.username}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3 text-ink-500">{user.teamName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <Badge tone="green">فعّال</Badge>
                      ) : (
                        <Badge tone="red">معطّل</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(user)}
                          aria-label={`تعديل ${user.fullName}`}
                          className="grid size-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-sand-100 hover:text-ink-800"
                        >
                          <IconEdit className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPasswordTarget(user)}
                          aria-label={`إعادة تعيين كلمة مرور ${user.fullName}`}
                          className="grid size-9 place-items-center rounded-lg text-ink-400 transition-colors hover:bg-sand-100 hover:text-ink-800"
                        >
                          <IconKey className="size-4" />
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(user)}
                          disabled={user.id === currentUser.id}
                        >
                          {user.isActive ? "تعطيل" : "تفعيل"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* نافذة إنشاء/تعديل حساب */}
      <Modal
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? `تعديل حساب «${editing.fullName}»` : "حساب جديد"}
      >
        <form onSubmit={save} className="space-y-4">
          {!editing && (
            <Field
              label="اسم الدخول"
              required
              hint="لا يمكن تغييره لاحقًا"
            >
              <Input
                dir="ltr"
                className="text-start font-mono"
                value={form.username}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
                required
                placeholder="ashbal"
              />
            </Field>
          )}

          <Field label="الاسم الكامل" required>
            <Input
              value={form.fullName}
              onChange={(event) => setForm({ ...form, fullName: event.target.value })}
              required
              placeholder="مسؤول فرقة الأشبال"
            />
          </Field>

          {!editing && (
            <Field label="كلمة المرور" required hint="٨ محارف على الأقل">
              <Input
                dir="ltr"
                className="text-start"
                type="text"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                required
                minLength={8}
                placeholder="كلمة مرور مبدئية"
              />
            </Field>
          )}

          <Field label="الدور" required>
            <Select
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value as Role })}
              disabled={editing?.id === currentUser.id}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          </Field>

          {form.role === "TEAM_LEADER" && (
            <Field label="اسم الفرقة" required>
              <Input
                value={form.teamName}
                onChange={(event) => setForm({ ...form, teamName: event.target.value })}
                required
                placeholder="فرقة الأشبال"
              />
            </Field>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              إلغاء
            </Button>
            <Button type="submit" loading={saving}>
              حفظ
            </Button>
          </div>
        </form>
      </Modal>

      <PasswordModal
        user={passwordTarget}
        onClose={() => setPasswordTarget(null)}
        onDone={() => mutate()}
      />
    </div>
  );
}

function PasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: UserDto | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await apiPost(`/api/users/${user.id}/password`, { password });
      toast.success(`أُعيد تعيين كلمة مرور «${user.fullName}»`);
      setPassword("");
      onClose();
      onDone();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title="إعادة تعيين كلمة المرور"
      description={
        user
          ? `سلّم كلمة المرور الجديدة إلى «${user.fullName}» واطلب منه تغييرها لاحقًا.`
          : undefined
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="كلمة المرور الجديدة" required hint="٨ محارف على الأقل">
          <Input
            dir="ltr"
            className="text-start"
            type="text"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" loading={saving}>
            حفظ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
