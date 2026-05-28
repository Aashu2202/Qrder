'use client';

import { useEffect, useState, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X, ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, apiBase, getAccessToken, type ApiError } from '@/lib/api';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface FormValues {
  categoryId: string;
  name: string;
  description: string;
  basePriceRupees: number;
  isVeg: boolean;
  spicyLevel: number;
  prepTimeMinutes: number | null;
  isAvailable: boolean;
}

interface ModifierGroup {
  id: string;
  name: string;
  selectionType: string;
  modifiers: Array<{ id: string; name: string }>;
}

interface SignedCloudinary {
  provider: 'cloudinary';
  signed: {
    cloudName: string;
    apiKey: string;
    folder: string;
    timestamp: number;
    signature: string;
  };
}
interface SignedNoop {
  provider: 'noop';
  signed: null;
}
type SignedResponse = SignedCloudinary | SignedNoop;

export function ItemDialog({
  item,
  categories,
  onClose,
}: {
  item: MenuItem | null;
  categories: MenuCategory[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!item;
  const [imageUrl, setImageUrl] = useState<string | null>(item?.imageUrl ?? null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  const groups = useQuery({
    queryKey: ['modifier-groups'],
    queryFn: () => apiFetch<{ items: ModifierGroup[] }>('/v1/menu/modifier-groups'),
  });

  const itemGroups = useQuery({
    queryKey: ['item-groups', item?.id],
    queryFn: () =>
      apiFetch<{ items: ModifierGroup[] }>(`/v1/menu/items/${item!.id}/modifier-groups`),
    enabled: !!item,
  });

  useEffect(() => {
    if (itemGroups.data) {
      setSelectedGroups(new Set(itemGroups.data.items.map((g) => g.id)));
    }
  }, [itemGroups.data]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      categoryId: item?.categoryId ?? categories[0]?.id ?? '',
      name: item?.name ?? '',
      description: item?.description ?? '',
      basePriceRupees: item ? item.basePrice / 100 : 0,
      isVeg: item?.isVeg ?? true,
      spicyLevel: item?.spicyLevel ?? 0,
      prepTimeMinutes: item?.prepTimeMinutes ?? null,
      isAvailable: item?.isAvailable ?? true,
    },
  });

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const payload = {
        categoryId: v.categoryId,
        name: v.name,
        description: v.description || null,
        basePrice: Math.round(v.basePriceRupees * 100),
        isVeg: v.isVeg,
        spicyLevel: Number(v.spicyLevel),
        prepTimeMinutes: v.prepTimeMinutes ? Number(v.prepTimeMinutes) : null,
        isAvailable: v.isAvailable,
        imageUrl,
        imageBase64: imageBase64 ?? undefined,
        tags: [],
      };
      const saved =
        isEdit && item
          ? await apiFetch<MenuItem>(`/v1/menu/items/${item.id}`, {
              method: 'PATCH',
              json: payload,
            })
          : await apiFetch<MenuItem>('/v1/menu/items', { method: 'POST', json: payload });

      await apiFetch(`/v1/menu/items/${saved.id}/modifier-groups`, {
        method: 'PUT',
        json: { groupIds: Array.from(selectedGroups) },
      });
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-items'] });
      qc.invalidateQueries({ queryKey: ['item-groups'] });
      toast.success(isEdit ? 'Item updated' : 'Item created');
      onClose();
    },
  });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be < 5MB');
      return;
    }
    setUploading(true);
    try {
      const signed = await apiFetch<SignedResponse>('/v1/uploads/sign', {
        method: 'POST',
        json: { folder: 'menu' },
      }).catch(() => null);

      if (signed && signed.provider === 'cloudinary' && signed.signed) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('api_key', signed.signed.apiKey);
        fd.append('timestamp', String(signed.signed.timestamp));
        fd.append('signature', signed.signed.signature);
        fd.append('folder', signed.signed.folder);
        const upload = await fetch(
          `https://api.cloudinary.com/v1_1/${signed.signed.cloudName}/image/upload`,
          { method: 'POST', body: fd },
        );
        if (!upload.ok) throw new Error('Cloudinary upload failed');
        const data = (await upload.json()) as { secure_url: string };
        setImageUrl(data.secure_url);
        setImageBase64(null);
      } else {
        const reader = new FileReader();
        await new Promise<void>((resolve, reject) => {
          reader.onload = () => {
            setImageBase64(String(reader.result));
            setImageUrl(null);
            resolve();
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      }
    } catch (err) {
      toast.error((err as Error).message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const previewSrc = imageBase64 ?? imageUrl ?? '';
  void apiBase;
  void getAccessToken;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 grid place-items-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold tracking-tight">
            {isEdit ? 'Edit menu item' : 'New menu item'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <FormSelect {...register('categoryId', { required: true })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </FormSelect>
            </Field>
            <Field label="Veg / Non-veg">
              <FormSelect
                {...register('isVeg', { setValueAs: (v) => v === 'true' || v === true })}
                defaultValue={item ? String(item.isVeg) : 'true'}
              >
                <option value="true">Veg</option>
                <option value="false">Non-veg</option>
              </FormSelect>
            </Field>
          </div>

          <Field label="Name" error={errors.name?.message}>
            <FormInput {...register('name', { required: 'Required', maxLength: 128 })} />
          </Field>

          <Field label="Description">
            <FormTextarea rows={2} {...register('description')} />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Price (₹)">
              <FormInput
                type="number"
                step="1"
                {...register('basePriceRupees', {
                  valueAsNumber: true,
                  required: true,
                  min: 0,
                })}
              />
            </Field>
            <Field label="Prep time (min)">
              <FormInput type="number" {...register('prepTimeMinutes', { valueAsNumber: true })} />
            </Field>
            <Field label="Spicy">
              <FormSelect {...register('spicyLevel', { valueAsNumber: true })}>
                <option value="0">Mild</option>
                <option value="1">Light 🌶</option>
                <option value="2">Medium 🌶🌶</option>
                <option value="3">Hot 🌶🌶🌶</option>
              </FormSelect>
            </Field>
          </div>

          <Field label="Image">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800">
                <ImagePlus size={12} />
                Choose image
                <input
                  type="file"
                  accept="image/*"
                  onChange={onFile}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
              {uploading && <span className="text-xs text-zinc-500">Uploading…</span>}
              {previewSrc && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewSrc}
                  alt=""
                  className="h-14 w-14 rounded-lg object-cover ring-1 ring-zinc-200 dark:ring-zinc-800"
                />
              )}
            </div>
          </Field>

          <Field label="Modifier groups">
            {(groups.data?.items ?? []).length === 0 ? (
              <p className="text-xs text-zinc-500">
                No groups defined.{' '}
                <a href="/menu/modifiers" className="text-brand-700 underline dark:text-brand-400">
                  Create one
                </a>{' '}
                first to offer size/add-on choices.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(groups.data?.items ?? []).map((g) => {
                  const active = selectedGroups.has(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() =>
                        setSelectedGroups((s) => {
                          const next = new Set(s);
                          if (next.has(g.id)) next.delete(g.id);
                          else next.add(g.id);
                          return next;
                        })
                      }
                      className={
                        'rounded-full px-3 py-1 text-xs font-medium border transition ' +
                        (active
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white'
                          : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800 dark:hover:bg-zinc-800')
                      }
                    >
                      {g.name}
                      <span className={active ? 'ml-1 text-white/70 dark:text-zinc-700' : 'ml-1 text-zinc-400'}>
                        {g.modifiers.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Field>

          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              {...register('isAvailable')}
            />
            <span className="text-zinc-700 dark:text-zinc-300">Available</span>
          </label>

          {save.error && (
            <p className="text-xs text-red-600">
              {(save.error as unknown as ApiError).detail ?? 'Save failed'}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="gradient"
              size="sm"
              loading={save.isPending}
              disabled={uploading}
            >
              {isEdit ? 'Save changes' : 'Create item'}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const FormInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function FormInput({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        {...rest}
        className={
          'w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 ' +
          className
        }
      />
    );
  },
);

const FormSelect = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function FormSelect({ className = '', children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        {...rest}
        className={
          'w-full h-9 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 ' +
          className
        }
      >
        {children}
      </select>
    );
  },
);

const FormTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function FormTextarea({ className = '', ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        {...rest}
        className={
          'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-800 dark:bg-zinc-950 ' +
          className
        }
      />
    );
  },
);
