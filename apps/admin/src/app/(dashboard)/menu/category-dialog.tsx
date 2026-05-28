'use client';

import { useEffect, forwardRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { apiFetch, type ApiError } from '@/lib/api';
import type { MenuCategory } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface FormValues {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

export function CategoryDialog({
  category,
  onClose,
}: {
  category: MenuCategory | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      displayOrder: category?.displayOrder ?? 0,
      isActive: category?.isActive ?? true,
    },
  });

  const name = watch('name');
  useEffect(() => {
    if (!isEdit && name) setValue('slug', slugify(name));
  }, [name, isEdit, setValue]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && category) {
        return apiFetch(`/v1/menu/categories/${category.id}`, { method: 'PATCH', json: values });
      }
      return apiFetch('/v1/menu/categories', { method: 'POST', json: values });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['menu-categories'] });
      toast.success(isEdit ? 'Category updated' : 'Category created');
      onClose();
    },
  });

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
        className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold tracking-tight">
            {isEdit ? 'Edit category' : 'New category'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3">
          <Field label="Name" error={errors.name?.message}>
            <FormInput {...register('name', { required: 'Required', maxLength: 64 })} />
          </Field>
          <Field label="Slug" error={errors.slug?.message}>
            <FormInput
              {...register('slug', {
                required: 'Required',
                pattern: { value: /^[a-z0-9-]+$/, message: 'lowercase, dashes only' },
              })}
            />
          </Field>
          <Field label="Display order">
            <FormInput type="number" {...register('displayOrder', { valueAsNumber: true })} />
          </Field>
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-zinc-300 text-brand-600 focus:ring-brand-500"
              {...register('isActive')}
            />
            <span className="text-zinc-700 dark:text-zinc-300">Active</span>
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
            <Button type="submit" variant="gradient" size="sm" loading={save.isPending}>
              {isEdit ? 'Save changes' : 'Create'}
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
