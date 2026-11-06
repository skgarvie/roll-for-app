import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cx } from './cx';

const fieldClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-base text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100';

interface CommonProps {
  label: string;
  hint?: string;
}

type InputFieldProps = CommonProps & InputHTMLAttributes<HTMLInputElement> & { multiline?: false };
type TextAreaFieldProps = CommonProps &
  TextareaHTMLAttributes<HTMLTextAreaElement> & { multiline: true };

/** Labelled text input. Real form controls keep iPadOS Scribble working. */
export function TextField(props: InputFieldProps | TextAreaFieldProps) {
  const autoId = useId();
  const id = props.id ?? autoId;
  const hintId = props.hint ? `${id}-hint` : undefined;

  let control;
  if (props.multiline) {
    const { label, hint, multiline, className, ...rest } = props;
    control = (
      <textarea
        id={id}
        aria-describedby={hintId}
        rows={3}
        className={cx(fieldClass, className)}
        {...rest}
      />
    );
  } else {
    const { label, hint, multiline, className, ...rest } = props;
    control = (
      <input id={id} aria-describedby={hintId} className={cx(fieldClass, className)} {...rest} />
    );
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-stone-700 dark:text-stone-300">
        {props.label}
      </label>
      {control}
      {props.hint && (
        <p id={hintId} className="text-sm text-stone-500">
          {props.hint}
        </p>
      )}
    </div>
  );
}
