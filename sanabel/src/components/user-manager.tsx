"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { createUser, setUserPassword, toggleUserActive } from "@/actions/users";
import { FormError, SubmitButton, fieldError } from "@/components/form";
import { PlusIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { ROLES, ROLE_LABEL, type Role } from "@/lib/domain";

type Team = { id: number; name: string };

export function NewUserButton({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("TEAM_LEADER");
  const [state, formAction] = useActionState(createUser, null);

  useEffect(() => {
    if (state?.ok) {
      notify("أُنشئ الحساب.");
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon className="size-4" />
        حساب جديد
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="إنشاء حساب"
        description="لا يوجد تسجيل ذاتي — الحسابات تُنشأ من هنا حصراً."
      >
        <form action={formAction} noValidate>
          <FormError state={state} />

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="اسم المستخدم"
                required
                error={fieldError(state, "username")}
                hint="حروف لاتينية وأرقام"
              >
                <Input
                  name="username"
                  dir="ltr"
                  className="text-left"
                  maxLength={40}
                  required
                />
              </Field>

              <Field
                label="الاسم الظاهر"
                required
                error={fieldError(state, "fullName")}
              >
                <Input name="fullName" maxLength={80} required />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="الدور" required error={fieldError(state, "role")}>
                <Select
                  name="role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                >
                  {ROLES.map((value) => (
                    <option key={value} value={value}>
                      {ROLE_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </Field>

              {role === "TEAM_LEADER" ? (
                <Field label="الفرقة" required error={fieldError(state, "teamId")}>
                  <Select name="teamId" required defaultValue="">
                    <option value="">اختر الفرقة…</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : null}
            </div>

            <Field
              label="كلمة المرور الأولية"
              required
              error={fieldError(state, "password")}
              hint="٨ محارف على الأقل، تحتوي حرفاً ورقماً"
            >
              <Input
                type="text"
                name="password"
                dir="ltr"
                className="text-left"
                minLength={8}
                required
              />
            </Field>
          </div>

          <Alert tone="warn" className="mt-4 text-xs">
            سلّم كلمة المرور لصاحب الحساب بشكل مباشر، وغيّرها إن تسرّبت.
          </Alert>

          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton pendingLabel="جارٍ الإنشاء…">إنشاء الحساب</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function PasswordButton({
  id,
  fullName,
}: {
  id: number;
  fullName: string;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(setUserPassword, null);

  useEffect(() => {
    if (state?.ok) {
      notify(`غُيّرت كلمة مرور «${fullName}».`);
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router, fullName]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        كلمة المرور
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`كلمة مرور «${fullName}»`}
        description="تسري فوراً. الجلسات المفتوحة تبقى صالحة حتى انتهاء مدّتها."
        size="sm"
      >
        <form action={formAction} noValidate>
          <input type="hidden" name="id" value={id} />
          <FormError state={state} />
          <Field
            label="كلمة المرور الجديدة"
            required
            error={fieldError(state, "password")}
            hint="٨ محارف على الأقل، تحتوي حرفاً ورقماً"
          >
            <Input
              type="text"
              name="password"
              dir="ltr"
              className="text-left"
              minLength={8}
              required
            />
          </Field>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <SubmitButton pendingLabel="جارٍ الحفظ…">حفظ</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ActiveToggle({
  id,
  fullName,
  isActive,
  isSelf,
}: {
  id: number;
  fullName: string;
  isActive: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(toggleUserActive, null);

  useEffect(() => {
    if (state?.ok) {
      notify(state.data.isActive ? "فُعّل الحساب." : "عُطّل الحساب.");
      setOpen(false);
      router.refresh();
    }
  }, [state, notify, router]);

  if (isSelf) {
    return <span className="text-xs text-ink-400">حسابك</span>;
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {isActive ? "تعطيل" : "تفعيل"}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={isActive ? `تعطيل «${fullName}»` : `تفعيل «${fullName}»`}
        description={
          isActive
            ? "لن يتمكّن من الدخول، وتُرفض جلسته الحالية عند أول طلب. سجلاته تبقى كما هي."
            : "سيعود قادراً على الدخول واستخدام صلاحياته."
        }
        size="sm"
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <FormError state={state} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              تراجع
            </Button>
            <SubmitButton
              variant={isActive ? "danger" : "primary"}
              pendingLabel="جارٍ التنفيذ…"
            >
              تأكيد
            </SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}
