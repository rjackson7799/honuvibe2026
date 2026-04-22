export type InstructorWeight = { instructor_id: string; pct: number };

export type SplitInput = {
  gross: number;
  partnerSharePct: number | null;
  instructorSharePct: number;
  instructorWeights: InstructorWeight[];
};

export type SplitOutput = {
  partner: number;
  instructor_total: number;
  honuvibe: number;
  per_instructor: Array<{ instructor_id: string; amount: number }>;
};

function normalizePercent(value: number | null | undefined, label: string): number {
  if (value == null) return 0;
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`${label} must be between 0 and 100`);
  }
  return value;
}

export function roundHalfAwayFromZero(n: number): number {
  if (!Number.isFinite(n)) {
    throw new Error('Cannot round a non-finite number');
  }

  if (n === 0) return 0;
  return n > 0 ? Math.floor(n + 0.5) : Math.ceil(n - 0.5);
}

export function computeEnrollmentSplit(input: SplitInput): SplitOutput {
  const gross = input.gross;
  if (!Number.isInteger(gross) || gross < 0) {
    throw new Error('gross must be a non-negative integer');
  }

  const partnerSharePct = normalizePercent(
    input.partnerSharePct,
    'partnerSharePct',
  );
  const instructorSharePct = normalizePercent(
    input.instructorSharePct,
    'instructorSharePct',
  );

  if (partnerSharePct + instructorSharePct > 100) {
    throw new Error('partnerSharePct + instructorSharePct cannot exceed 100');
  }

  const normalizedWeights = input.instructorWeights.map((weight, index) => {
    if (!weight.instructor_id) {
      throw new Error(`instructorWeights[${index}] is missing instructor_id`);
    }
    if (!Number.isFinite(weight.pct) || weight.pct < 0) {
      throw new Error(`instructorWeights[${index}].pct must be non-negative`);
    }

    return {
      ...weight,
      pct: weight.pct,
      index,
    };
  });

  const partner = roundHalfAwayFromZero((gross * partnerSharePct) / 100);
  let instructorTotal = roundHalfAwayFromZero((gross * instructorSharePct) / 100);

  const totalWeight = normalizedWeights.reduce((sum, weight) => sum + weight.pct, 0);

  if (normalizedWeights.length === 0 || totalWeight <= 0 || instructorTotal === 0) {
    instructorTotal = 0;
    return {
      partner,
      instructor_total: 0,
      honuvibe: gross - partner,
      per_instructor: [],
    };
  }

  const perInstructor = normalizedWeights.map((weight) => ({
    instructor_id: weight.instructor_id,
    amount: roundHalfAwayFromZero((instructorTotal * weight.pct) / totalWeight),
    pct: weight.pct,
    index: weight.index,
  }));

  let residue = instructorTotal - perInstructor.reduce((sum, item) => sum + item.amount, 0);

  if (residue !== 0) {
    const distributionOrder = [...perInstructor].sort((a, b) => {
      if (b.pct !== a.pct) return b.pct - a.pct;
      return a.index - b.index;
    });

    let cursor = 0;
    while (residue !== 0 && distributionOrder.length > 0) {
      const target = distributionOrder[cursor % distributionOrder.length];
      if (residue > 0) {
        target.amount += 1;
        residue -= 1;
      } else if (target.amount > 0) {
        target.amount -= 1;
        residue += 1;
      }
      cursor += 1;
    }
  }

  return {
    partner,
    instructor_total: instructorTotal,
    honuvibe: gross - partner - instructorTotal,
    per_instructor: perInstructor.map(({ instructor_id, amount }) => ({
      instructor_id,
      amount,
    })),
  };
}
