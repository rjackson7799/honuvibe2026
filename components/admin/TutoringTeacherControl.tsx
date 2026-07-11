'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setTutoringTeacher } from '@/lib/tutoring/actions';

type TeacherOption = { id: string; name: string };

type TutoringTeacherControlProps = {
  courseId: string;
  current: { profileId: string; name: string } | null;
  options: TeacherOption[];
};

const UNASSIGNED = '';

/**
 * Slim one-line control for the single-teacher assignment on a 1v1
 * engagement. Deliberately not InstructorAssignControl (multi-instructor +
 * roles + revenue share) — this is Assign/Change/Remove for exactly one
 * teacher, backed by setTutoringTeacher().
 */
export function TutoringTeacherControl({ courseId, current, options }: TutoringTeacherControlProps) {
  const router = useRouter();
  const [selected, setSelected] = useState(current?.profileId ?? UNASSIGNED);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const dirty = selected !== (current?.profileId ?? UNASSIGNED);

  function handleSave() {
    start(async () => {
      try {
        await setTutoringTeacher({ courseId, instructorProfileId: selected || null });
        setMsg({ ok: true, text: 'Saved.' });
        router.refresh();
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : 'Failed to save.' });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-bg-secondary px-4 py-3">
      <span className="flex items-center gap-1.5 text-[13px] font-medium text-fg-secondary">
        <UserCheck size={14} className="text-fg-tertiary" />
        Teacher: <span className="text-fg-primary">{current?.name ?? 'Unassigned'}</span>
      </span>
      <select
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value);
          setMsg(null);
        }}
        disabled={pending}
        className="min-h-[44px] rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-[13px] text-fg-primary focus:border-accent-teal focus:outline-none disabled:opacity-50"
      >
        <option value={UNASSIGNED}>Unassigned</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
      <Button variant="primary" size="sm" onClick={handleSave} disabled={pending || !dirty}>
        {pending ? 'Saving…' : 'Save'}
      </Button>
      {msg && (
        <span className={`text-[13px] ${msg.ok ? 'text-accent-teal' : 'text-red-600'}`}>{msg.text}</span>
      )}
    </div>
  );
}
