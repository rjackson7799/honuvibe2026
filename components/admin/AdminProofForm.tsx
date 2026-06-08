'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Star, Trash2 } from 'lucide-react';
import {
  createProof,
  updateProof,
  publishProof,
  unpublishProof,
  setProofFeatured,
  deleteProof,
} from '@/lib/proof/actions';
import {
  PROOF_ARTIFACT_TYPES,
  PROOF_SOURCES,
  type CreateProofArtifactInput,
  type ProofArtifact,
  type ProofArtifactType,
  type ProofSource,
} from '@/lib/proof/types';

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border-default text-fg-primary text-sm focus:border-accent-teal outline-none';
const labelCls = 'block text-[13px] font-medium text-fg-secondary mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 h-10 px-4 rounded-[10px] bg-[color:var(--accent-teal)] hover:bg-[color:var(--accent-teal-hover)] text-white text-[13px] font-semibold disabled:opacity-50 transition-all';
const btnGhost =
  'inline-flex items-center gap-2 h-10 px-3.5 rounded-[10px] bg-bg-secondary border border-border-default text-fg-secondary text-[13px] font-semibold hover:text-fg-primary hover:border-border-hover disabled:opacity-50 transition-colors';

export function AdminProofForm({ proof }: { proof: ProofArtifact | null }) {
  const router = useRouter();
  const isCreate = proof === null;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [artifactType, setArtifactType] = useState<ProofArtifactType>(
    proof?.artifact_type ?? PROOF_ARTIFACT_TYPES[0],
  );
  const [proofSource, setProofSource] = useState<ProofSource>(
    proof?.proof_source ?? 'manual',
  );
  const [quoteEn, setQuoteEn] = useState(proof?.quote_en ?? '');
  const [quoteJp, setQuoteJp] = useState(proof?.quote_jp ?? '');
  const [titleEn, setTitleEn] = useState(proof?.title_en ?? '');
  const [titleJp, setTitleJp] = useState(proof?.title_jp ?? '');
  const [personName, setPersonName] = useState(proof?.person_name ?? '');
  const [roleEn, setRoleEn] = useState(proof?.role_en ?? '');
  const [roleJp, setRoleJp] = useState(proof?.role_jp ?? '');
  const [org, setOrg] = useState(proof?.org ?? '');
  const [organizationUrl, setOrganizationUrl] = useState(proof?.organization_url ?? '');
  const [personImageUrl, setPersonImageUrl] = useState(proof?.person_image_url ?? '');
  const [logoUrl, setLogoUrl] = useState(proof?.logo_url ?? '');
  const [rating, setRating] = useState<string>(
    proof?.rating != null ? String(proof.rating) : '',
  );
  const [displayOrder, setDisplayOrder] = useState<string>(
    String(proof?.display_order ?? 0),
  );
  const [quotePermission, setQuotePermission] = useState(proof?.quote_permission ?? false);
  const [namePublic, setNamePublic] = useState(proof?.name_public ?? false);
  const [logoPermission, setLogoPermission] = useState(proof?.logo_permission ?? false);
  const [permissionNotes, setPermissionNotes] = useState(proof?.permission_notes ?? '');

  async function run(fn: () => Promise<unknown>, ok = 'Saved.') {
    setBusy(true);
    setMessage('');
    try {
      await fn();
      setMessage(ok);
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  function payload(): CreateProofArtifactInput {
    const parsedRating = rating.trim() === '' ? null : Number(rating);
    return {
      artifact_type: artifactType,
      proof_source: proofSource,
      quote_en: quoteEn,
      quote_jp: quoteJp || null,
      title_en: titleEn || null,
      title_jp: titleJp || null,
      person_name: personName || null,
      role_en: roleEn || null,
      role_jp: roleJp || null,
      org: org || null,
      organization_url: organizationUrl || null,
      person_image_url: personImageUrl || null,
      logo_url: logoUrl || null,
      rating: parsedRating != null && Number.isFinite(parsedRating) ? parsedRating : null,
      quote_permission: quotePermission,
      name_public: namePublic,
      logo_permission: logoPermission,
      permission_notes: permissionNotes || null,
      display_order: Number(displayOrder) || 0,
    };
  }

  const canCreate = quoteEn.trim() !== '';

  async function handleCreate() {
    await run(async () => {
      const { id } = await createProof(payload());
      router.push(`/admin/proof/${id}`);
    }, 'Created.');
  }

  return (
    <div className="max-w-[920px] space-y-6">
      <BackLink />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[clamp(20px,2.4vw,26px)] font-bold text-fg-primary tracking-[-0.02em]">
            {isCreate ? 'New Proof' : personName || 'Anonymous story'}
          </h1>
          {!isCreate && (
            <p className="text-[13px] text-fg-tertiary mt-1">
              {proof!.is_published ? 'Published' : 'Draft'}
              {proof!.is_featured ? ' · Featured' : ''}
            </p>
          )}
        </div>

        {!isCreate && (
          <div className="flex items-center gap-2 flex-wrap">
            {proof!.is_published ? (
              <button
                className={btnGhost}
                disabled={busy}
                onClick={() => run(() => unpublishProof(proof!.id), 'Unpublished.')}
              >
                <EyeOff size={15} /> Unpublish
              </button>
            ) : (
              <button
                className={btnPrimary}
                disabled={busy}
                onClick={() => run(() => publishProof(proof!.id), 'Published.')}
              >
                <Eye size={15} /> Publish
              </button>
            )}
            <button
              className={btnGhost}
              disabled={busy}
              onClick={() =>
                run(
                  () => setProofFeatured(proof!.id, !proof!.is_featured),
                  proof!.is_featured ? 'Unfeatured.' : 'Featured.',
                )
              }
            >
              <Star size={15} /> {proof!.is_featured ? 'Unfeature' : 'Feature'}
            </button>
            <button
              className={btnGhost}
              disabled={busy}
              onClick={() => {
                if (window.confirm('Delete this proof artifact?')) {
                  run(async () => {
                    await deleteProof(proof!.id);
                    router.push('/admin/proof');
                  }, 'Deleted.');
                }
              }}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
        )}
      </div>

      {message && <Banner text={message} />}

      <div className="space-y-4">
        {/* Basics */}
        <div className="grid sm:grid-cols-3 gap-4">
          <Labeled label="Type">
            <select
              className={inputCls}
              value={artifactType}
              onChange={(e) => setArtifactType(e.target.value as ProofArtifactType)}
            >
              {PROOF_ARTIFACT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Source">
            <select
              className={inputCls}
              value={proofSource}
              onChange={(e) => setProofSource(e.target.value as ProofSource)}
            >
              {PROOF_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Display order">
            <input
              className={inputCls}
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(e.target.value)}
            />
          </Labeled>
        </div>

        {/* Quote */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Quote (EN)">
            <textarea className={inputCls} rows={4} value={quoteEn} onChange={(e) => setQuoteEn(e.target.value)} />
          </Labeled>
          <Labeled label="Quote (JP)">
            <textarea className={inputCls} rows={4} value={quoteJp} onChange={(e) => setQuoteJp(e.target.value)} />
          </Labeled>
        </div>

        {/* Optional headline */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Headline (EN) — optional">
            <input className={inputCls} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} />
          </Labeled>
          <Labeled label="Headline (JP) — optional">
            <input className={inputCls} value={titleJp} onChange={(e) => setTitleJp(e.target.value)} />
          </Labeled>
        </div>

        {/* Attribution */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Labeled label="Person name">
            <input className={inputCls} value={personName} onChange={(e) => setPersonName(e.target.value)} />
          </Labeled>
          <Labeled label="Organization">
            <input className={inputCls} value={org} onChange={(e) => setOrg(e.target.value)} />
          </Labeled>
          <Labeled label="Role (EN)">
            <input className={inputCls} value={roleEn} onChange={(e) => setRoleEn(e.target.value)} />
          </Labeled>
          <Labeled label="Role (JP)">
            <input className={inputCls} value={roleJp} onChange={(e) => setRoleJp(e.target.value)} />
          </Labeled>
          <Labeled label="Person image URL">
            <input className={inputCls} value={personImageUrl} onChange={(e) => setPersonImageUrl(e.target.value)} />
          </Labeled>
          <Labeled label="Logo URL">
            <input className={inputCls} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
          </Labeled>
          <Labeled label="Organization URL">
            <input className={inputCls} value={organizationUrl} onChange={(e) => setOrganizationUrl(e.target.value)} />
          </Labeled>
          <Labeled label="Rating (1–5) — optional">
            <input className={inputCls} type="number" min={1} max={5} value={rating} onChange={(e) => setRating(e.target.value)} />
          </Labeled>
        </div>

        {/* Permissions — consent gate */}
        <div className="rounded-xl border border-border-default bg-bg-secondary p-4 space-y-3">
          <p className="text-[13px] font-semibold text-fg-primary">Display permissions (consent)</p>
          <p className="text-[12px] text-fg-tertiary">
            The public site reads a sanitized view: the quote shows only with quote permission, the
            name/role/photo only with “name public”, and the logo/org link only with logo permission.
          </p>
          <Toggle label="Quote permission (required to publish)" value={quotePermission} onChange={setQuotePermission} />
          <Toggle label="Name / role / photo public" value={namePublic} onChange={setNamePublic} />
          <Toggle label="Logo / org link permission" value={logoPermission} onChange={setLogoPermission} />
          <Labeled label="Permission notes (who approved, when)">
            <textarea className={inputCls} rows={2} value={permissionNotes} onChange={(e) => setPermissionNotes(e.target.value)} />
          </Labeled>
        </div>

        {isCreate ? (
          <button className={btnPrimary} disabled={busy || !canCreate} onClick={handleCreate}>
            Create proof
          </button>
        ) : (
          <button className={btnPrimary} disabled={busy} onClick={() => run(() => updateProof(proof!.id, payload()))}>
            Save proof
          </button>
        )}

        {isCreate && (
          <p className="text-[12px] text-fg-tertiary">
            A quote (EN) is enough to create the draft. Grant quote permission and confirm
            attribution permissions before publishing — they gate what shows publicly.
          </p>
        )}
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <a
      href="/admin/proof"
      className="inline-flex items-center gap-1.5 text-[13px] text-fg-tertiary hover:text-fg-secondary"
    >
      <ArrowLeft size={15} /> All proof
    </a>
  );
}

function Banner({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-2.5 text-[13px] text-fg-secondary">
      {text}
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border-default accent-[color:var(--accent-teal)]"
      />
      <span className="text-[13px] text-fg-secondary">{label}</span>
    </label>
  );
}
