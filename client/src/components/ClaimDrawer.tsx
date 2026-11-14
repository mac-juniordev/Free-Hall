
import { useState } from 'react';
import type { Hall } from '../types/api';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { X } from 'lucide-react';
import { claimHall } from '../lib/api-halls';
import { extractError } from '../lib/api';

type ClaimDrawerProps = {
  hall: Hall | null;
  onClose: () => void;
  onSuccess: (result: { warning: string | null }) => void;
};

const DURATIONS = [
  { label: '1 hr', value: 60 },
  { label: '2 hrs', value: 120 },
  { label: '3 hrs', value: 180 },
];

export function ClaimDrawer({
  hall,
  onClose,
  onSuccess,
}: ClaimDrawerProps) {
  const [courseCode, setCourseCode] = useState('');
  const [studentCount, setStudentCount] = useState('30');
  const [durationMin, setDurationMin] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    // Ensure a hall is selected before submitting.
    if (!hall) return;

    // Capture the hall ID before the asynchronous operation.
    const hallId = hall.id;

    setError('');
    setSubmitting(true);

    try {
      const result = await claimHall({
        hallId,
        courseCode: courseCode.trim(),
        studentCount: Number(studentCount),
        durationMin,
      });

      onSuccess({ warning: result.warning });
      onClose();
    } catch (err) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hall) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden
      />

      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-2xl">
        <div className="mx-auto max-w-md p-5">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#1F2937]">
                Claim {hall.name}
              </h2>

              <p className="text-xs text-[#6B7280]">
                {hall.zone} · {hall.approxCapacityRange}
              </p>
            </div>

            <button
              onClick={onClose}
              className="rounded p-1 text-[#6B7280] hover:bg-[#F4F6F8]"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <Input
              label="Course code"
              placeholder="SEN301"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              autoFocus
              required
            />

            <Input
              label="Student count"
              type="number"
              min={1}
              max={5000}
              value={studentCount}
              onChange={(e) => setStudentCount(e.target.value)}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[#1F2937]">
                Duration
              </label>

              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDurationMin(d.value)}
                    className={
                      durationMin === d.value
                        ? 'flex-1 rounded-md bg-[#0F766E] px-3 py-2 text-sm font-medium text-white'
                        : 'flex-1 rounded-md border border-[#DCE1E7] bg-white px-3 py-2 text-sm font-medium text-[#1F2937] hover:bg-[#F4F6F8]'
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button
              fullWidth
              size="lg"
              loading={submitting}
              onClick={handleSubmit}
              disabled={
                !courseCode.trim() ||
                !studentCount ||
                submitting
              }
            >
              Claim hall
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
