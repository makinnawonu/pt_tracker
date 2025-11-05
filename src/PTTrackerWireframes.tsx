// --------------------------------
// src/PTTrackerWireframes.tsx
// --------------------------------
import React from "react";
import {
  AppBar,
  Tabs,
  Tab,
  Box,
  Container,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  TextField,
  Grid,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";

// Types
type Category = "ankle" | "hamstring" | "quad" | "hip";
interface Exercise {
  id: string;
  name: string;
  category: Category;
  defaultWeight: number; // 0 allowed
  isActive: boolean;
}

// Seed exercises (edit freely)
const seed: Exercise[] = [
  { id: "q1", name: "Quad Extension", category: "quad", defaultWeight: 15, isActive: true },
  { id: "q2", name: "Goblet Squat", category: "quad", defaultWeight: 20, isActive: true },
  { id: "q3", name: "Step-Ups", category: "quad", defaultWeight: 10, isActive: true },
  { id: "h1", name: "Hamstring Curl", category: "hamstring", defaultWeight: 10, isActive: true },
  { id: "h2", name: "Romanian Deadlift", category: "hamstring", defaultWeight: 25, isActive: true },
  { id: "hip1", name: "Hip Abduction", category: "hip", defaultWeight: 8, isActive: true },
  { id: "hip2", name: "Glute Bridge", category: "hip", defaultWeight: 0, isActive: true },
  { id: "a1", name: "Ankle Dorsiflexion", category: "ankle", defaultWeight: 5, isActive: true },
  { id: "a2", name: "Ankle Circles", category: "ankle", defaultWeight: 0, isActive: true },
];

export default function PTTrackerWireframes() {
  const [tab, setTab] = React.useState(0);
  const [addOpen, setAddOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState("2025-10-22");

  const [exercises, setExercises] = React.useState<Exercise[]>(seed);
  const [planIds, setPlanIds] = React.useState<string[]>([]);
  const [weights, setWeights] = React.useState<Record<string, number>>({});
  const [planNotice, setPlanNotice] = React.useState<string | null>(null);

  // Helpers
  const byCategory = React.useMemo(() => {
    const groups: Record<Category, Exercise[]> = {
      ankle: [], hamstring: [], quad: [], hip: [],
    };
    exercises.filter(e => e.isActive).forEach(e => groups[e.category].push(e));
    return groups;
  }, [exercises]);

  function pickRandom<T>(arr: T[], n: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    while (n > 0 && copy.length) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
      n--;
    }
    return result;
  }

  const generatePlan = () => {
    const chosen: Exercise[] = [];
    const notes: string[] = [];

    const quads = pickRandom(byCategory.quad, 2);
    if (quads.length < 2) notes.push(`Only ${quads.length}/2 quad available.`);
    chosen.push(...quads);

    (['ankle','hamstring','hip'] as Category[]).forEach(cat => {
      const pick = pickRandom(byCategory[cat], 1);
      if (pick.length < 1) notes.push(`No ${cat} exercise available.`);
      chosen.push(...pick);
    });

    // De-duplicate just in case
    const uniq = Array.from(new Set(chosen.map(e => e.id)));
    setPlanIds(uniq);
    // Prefill weights for plan exercises
    setWeights(prev => {
      const next = { ...prev };
      uniq.forEach(id => {
        const ex = exercises.find(e => e.id === id)!;
        if (next[id] === undefined) next[id] = ex.defaultWeight;
      });
      return next;
    });
    setPlanNotice(notes.length ? notes.join(" ") : null);
  };

  const updateWeight = (id: string, value: number) => {
    setWeights(prev => ({ ...prev, [id]: value }));
  };

  const makeDefault = (id: string) => {
    setExercises(prev => prev.map(e => e.id === id ? { ...e, defaultWeight: weights[id] ?? e.defaultWeight } : e));
  };

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <AppBar position="sticky" color="primary" sx={{ top: 0 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          textColor="inherit"
          indicatorColor="secondary"
        >
          <Tab label="Today" />
          <Tab label="Exercises" />
          <Tab label="Calendar" />
        </Tabs>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {tab === 0 && (
          <TodayTab
            planIds={planIds}
            exercises={exercises}
            weights={weights}
            notice={planNotice}
            onGeneratePlan={generatePlan}
            onOpenAdd={() => setAddOpen(true)}
            onWeightChange={updateWeight}
            onMakeDefault={makeDefault}
          />
        )}
        {tab === 1 && <ExercisesTab list={exercises} onOpenAdd={() => setAddOpen(true)} />}
        {tab === 2 && (
          <CalendarTab
            onOpenDetail={(d) => {
              setSelectedDate(d);
              setDetailOpen(true);
            }}
          />
        )}
      </Container>

      {/* Dialogs */}
      <AddExerciseDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <DayDetailDialog
        open={detailOpen}
        date={selectedDate}
        onClose={() => setDetailOpen(false)}
        onOpenAdd={() => setAddOpen(true)}
      />
    </Box>
  );
}

// ===== Today (generator + logging UI) =====
function TodayTab({
  planIds,
  exercises,
  weights,
  notice,
  onGeneratePlan,
  onOpenAdd,
  onWeightChange,
  onMakeDefault,
}: {
  planIds: string[];
  exercises: Exercise[];
  weights: Record<string, number>;
  notice: string | null;
  onGeneratePlan: () => void;
  onOpenAdd: () => void;
  onWeightChange: (id: string, value: number) => void;
  onMakeDefault: (id: string) => void;
}) {
  const planExercises = planIds
    .map(id => exercises.find(e => e.id === id))
    .filter(Boolean) as Exercise[];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Generate Today's Plan
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Picks 2× quad + 1× ankle + 1× hamstring + 1× hip from active exercises.
          </Typography>
          {notice && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              {notice}
            </Alert>
          )}
          <Button fullWidth variant="contained" onClick={onGeneratePlan}>Generate Plan</Button>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Exercises
          </Typography>

          {planExercises.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No plan yet. Tap "Generate Plan" above.
            </Typography>
          ) : (
            planExercises.map((ex, idx) => (
              <React.Fragment key={ex.id}>
                {idx > 0 && <Divider sx={{ my: 1 }} />}
                <ExerciseRow
                  id={ex.id}
                  name={ex.name}
                  defaultWeight={ex.defaultWeight}
                  category={ex.category}
                  currentWeight={weights[ex.id] ?? ex.defaultWeight}
                  onChange={(val) => onWeightChange(ex.id, val)}
                  onMakeDefault={() => onMakeDefault(ex.id)}
                />
              </React.Fragment>
            ))
          )}
        </CardContent>
        <CardActions sx={{ px: 2 }}>
          <Button size="small" onClick={onOpenAdd}>Add Exercise</Button>
        </CardActions>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Notes
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="Add notes about today's session..."
          />
        </CardContent>
        <CardActions sx={{ p: 2 }}>
          <Button fullWidth variant="contained">Mark as Done</Button>
        </CardActions>
      </Card>
    </Box>
  );
}

function ExerciseRow({
  id,
  name,
  defaultWeight,
  category,
  currentWeight,
  onChange,
  onMakeDefault,
}: {
  id: string;
  name: string;
  defaultWeight: number;
  category: Category;
  currentWeight?: number;
  onChange?: (value: number) => void;
  onMakeDefault?: () => void;
}) {
  const [local, setLocal] = React.useState<number>(currentWeight ?? defaultWeight);
  React.useEffect(() => setLocal(currentWeight ?? defaultWeight), [currentWeight, defaultWeight]);

  return (
    <Grid container spacing={1} alignItems="center" sx={{ mb: 1 }}>
      <Grid item xs={7}>
        <Typography variant="body1" fontWeight={600}>
          {name}
        </Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 0.5 }}>
          <Chip size="small" label={`Category: ${category}`} />
          <Typography variant="caption" color="text.secondary">
            Default: {defaultWeight} lb
          </Typography>
        </Box>
      </Grid>
      <Grid item xs={5}>
        <TextField
          size="small"
          type="number"
          fullWidth
          label="Weight (lb)"
          value={local}
          onChange={(e) => {
            const val = Number(e.target.value);
            setLocal(val);
            onChange?.(val);
          }}
          inputProps={{ min: 0 }}
        />
        <Button size="small" sx={{ mt: 0.5 }} onClick={onMakeDefault}>Make default</Button>
      </Grid>
    </Grid>
  );
}

// ===== Exercises List =====
function ExercisesTab({ list, onOpenAdd }: { list: Exercise[]; onOpenAdd: () => void }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Exercises
          </Typography>
          <Button variant="contained" fullWidth sx={{ mb: 2 }} onClick={onOpenAdd}>Add Exercise</Button>

          {list.map((ex, i) => (
            <React.Fragment key={ex.id}>
              {i > 0 && <Divider sx={{ my: 1 }} />}
              <ExerciseListItem name={ex.name} category={ex.category} desc={"—"} defaultWeight={ex.defaultWeight} />
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
}

function ExerciseListItem({ name, category, desc, defaultWeight }: { name: string; category: string; desc: string; defaultWeight: number }) {
  return (
    <Grid container spacing={1} alignItems="center">
      <Grid item xs={8}>
        <Typography variant="subtitle1" fontWeight={600}>{name}</Typography>
        <Typography variant="body2" color="text.secondary">{desc}</Typography>
        <Box sx={{ mt: 0.5, display: "flex", gap: 1, alignItems: "center" }}>
          <Chip size="small" label={category} />
          <Typography variant="caption" color="text.secondary">Default: {defaultWeight} lb</Typography>
        </Box>
      </Grid>
      <Grid item xs={4}>
        <Button variant="outlined" fullWidth disabled>Edit</Button>
      </Grid>
    </Grid>
  );
}

// ===== Calendar + Day Detail Dialog =====
function CalendarTab({ onOpenDetail }: { onOpenDetail: (dateISO: string) => void }) {
  // Wireframe-only static month grid
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const monthISO = "2025-10"; // wireframe placeholder
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Calendar
          </Typography>
          <Grid container columns={7} spacing={1}>
            {days.map((d, idx) => (
              <Grid key={d} item xs={1}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDetail(`${monthISO}-${String(d).padStart(2, "0")}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onOpenDetail(`${monthISO}-${String(d).padStart(2, "0")}`);
                  }}
                  sx={{
                    p: 1.2,
                    textAlign: "center",
                    borderRadius: 1,
                    cursor: "pointer",
                    bgcolor: idx % 3 === 0 ? "success.light" : "grey.100",
                    color: idx % 3 === 0 ? "success.contrastText" : "text.primary",
                    '&:hover': { boxShadow: 2 }
                  }}
                >
                  <Typography variant="body2">{d}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          <Box sx={{ mt: 1, display: "flex", gap: 2 }}>
            <Chip size="small" label="Done" color="success" />
            <Chip size="small" label="Not logged" variant="outlined" />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function DayDetailDialog({ open, onClose, date, onOpenAdd }: { open: boolean; onClose: () => void; date: string; onOpenAdd: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Day Detail — {date}</DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="subtitle2">Performed Exercises</Typography>
          {/* Example static rows for the modal wireframe */}
          <ExerciseRow id="q1" name="Quad Extension" defaultWeight={15} category="quad" />
          <Divider sx={{ my: 1 }} />
          <ExerciseRow id="h1" name="Hamstring Curl" defaultWeight={12} category="hamstring" />

          <Divider sx={{ my: 1 }} />
          <Typography variant="subtitle2">Notes</Typography>
          <TextField fullWidth multiline minRows={3} placeholder="Notes you added on this day..." />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={onClose}>Save Changes</Button>
      </DialogActions>
    </Dialog>
  );
}
