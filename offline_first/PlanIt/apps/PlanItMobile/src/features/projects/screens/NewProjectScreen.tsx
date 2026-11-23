import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ScreenProps } from '../../../app/navigation';
import { repositories } from '../../../app/repositories';
import { toFieldErrors } from '../../../shared/domain/fieldErrors';
import { brandGradient } from '../../../shared/ui/Brand';
import { Button } from '../../../shared/ui/controls';
import { Gradient } from '../../../shared/ui/Gradient';
import { Icon } from '../../../shared/ui/Icon';
import { makeStyles, useTheme } from '../../../shared/ui/theme';
import { createProjectInputSchema } from '../domain/project';

const SUGGESTIONS = [
  { emoji: '🛒', name: 'Groceries' },
  { emoji: '💪', name: 'Fitness' },
  { emoji: '✈️', name: 'Travel' },
  { emoji: '🚀', name: 'Side Project' },
];

/** Bottom sheet: create a project, then open it straight away. */
export function NewProjectScreen({ navigation }: ScreenProps<'NewProject'>) {
  const theme = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();

  function changeName(value: string) {
    setName(value);
    setError(undefined);
  }

  async function create() {
    const result = createProjectInputSchema.safeParse({ name });
    if (!result.success) {
      setError(toFieldErrors(result.error).name);
      return;
    }
    const project = await repositories.projects.create(result.data);
    // Close the sheet, then open the new project's task list.
    navigation.goBack();
    navigation.navigate('Tasks', {
      projectId: project.id,
      projectName: project.name,
    });
  }

  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.header}>
        <Gradient colors={brandGradient} style={styles.preview}>
          {initial ? (
            <Text style={styles.previewLetter}>{initial}</Text>
          ) : (
            <Icon name="folder" size={24} color="#FFFFFF" />
          )}
        </Gradient>
        <View style={styles.headerText}>
          <Text style={styles.title}>New Project</Text>
          <Text style={styles.subtitle}>Keep related tasks together</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.close}
        >
          <Icon
            name="close"
            size={16}
            strokeWidth={2.5}
            color={theme.textSecondary}
          />
        </Pressable>
      </View>

      <TextInput
        testID="project-name-input"
        value={name}
        onChangeText={changeName}
        placeholder="Project name"
        placeholderTextColor={theme.textTertiary}
        style={[styles.input, error ? styles.inputError : null]}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.chips}>
        {SUGGESTIONS.map(suggestion => (
          <Pressable
            key={suggestion.name}
            onPress={() => changeName(suggestion.name)}
            style={({ pressed }) => [
              styles.chip,
              name === suggestion.name && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.chipText}>
              {suggestion.emoji} {suggestion.name}
            </Text>
          </Pressable>
        ))}
      </View>

      <Button
        testID="create-project"
        label="Create Project"
        icon="plus"
        onPress={create}
      />
    </View>
  );
}

const useStyles = makeStyles(t => ({
  sheet: {
    paddingHorizontal: 20,
    paddingTop: 28,
    gap: 14,
    backgroundColor: t.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 6,
  },
  preview: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLetter: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  headerText: { flex: 1 },
  title: { color: t.text, fontSize: 22, fontWeight: '800' },
  subtitle: { color: t.textSecondary, fontSize: 14, marginTop: 2 },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.surfaceMuted,
  },
  input: {
    color: t.text,
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    height: 56,
    borderRadius: 16,
    backgroundColor: t.background,
    borderWidth: 1.5,
    borderColor: t.border,
  },
  inputError: { borderColor: t.danger },
  error: {
    color: t.danger,
    fontSize: 13,
    fontWeight: '600',
    marginTop: -6,
    marginLeft: 4,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: t.background,
    borderWidth: 1,
    borderColor: t.border,
  },
  chipActive: { borderColor: t.primary, backgroundColor: t.primarySoft },
  chipText: { color: t.text, fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
}));
