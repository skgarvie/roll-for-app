import { useCallback, useMemo } from 'react';
import { updateSheetData } from '@/db/repos/characters';
import type { Character, Sheet } from '@/db/types';
import { normalizeCoreData, type CoreSheetData } from '@/domain/character';
import { deriveCharacter, type Derived } from '@/domain/derive';
import { useAutosave, type Autosave } from './useAutosave';

export interface CoreEditor extends Omit<Autosave<CoreSheetData>, 'value'> {
  data: CoreSheetData;
  derived: Derived;
  character: Character;
}

/** Autosaving editor for a character's core data, shared by the Core and Combat sheets. */
export function useCoreEditor(coreSheet: Sheet, character: Character): CoreEditor {
  const stored = useMemo(() => normalizeCoreData(coreSheet.data), [coreSheet.data]);
  const save = useCallback(
    (data: CoreSheetData) => updateSheetData(coreSheet.id, data as unknown as Sheet['data']),
    [coreSheet.id],
  );
  const { value, ...rest } = useAutosave({ id: coreSheet.id, stored, save });
  const derived = useMemo(() => deriveCharacter(value), [value]);
  return {
    ...rest,
    data: value,
    derived,
    character,
  };
}
