import { WeekView, type WeekSession } from "@/components/week/week-view";
import { requireUser } from "@/lib/auth";
import { BLOCKS_SELECT, toBlocks } from "@/lib/sessions/data";
import { addDays, estimateMinutes, exerciseCount, weekStart } from "@/lib/sessions/format";
import { todayIso } from "@/lib/today";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function WeekPage({ searchParams }: PageProps<"/week">) {
  const { supabase } = await requireUser();
  const { start: param } = await searchParams;
  const today = await todayIso();
  const start = weekStart(typeof param === "string" && ISO_DATE.test(param) ? param : today);
  const end = addDays(start, 6);

  const [{ data: sessions }, { data: schedule }] = await Promise.all([
    supabase
      .from("sessions")
      .select(`id, date, day_type, status, blocks(${BLOCKS_SELECT})`)
      .gte("date", start)
      .lte("date", end)
      .order("date"),
    supabase.from("schedule_days").select("weekday, day_type").order("weekday"),
  ]);

  const items: WeekSession[] = (sessions ?? []).map((s) => {
    const blocks = toBlocks(s.blocks);
    return {
      id: s.id,
      date: s.date,
      dayType: s.day_type,
      status: s.status,
      exercises: exerciseCount(blocks),
      minutes: blocks.length ? estimateMinutes(blocks) : 0,
    };
  });

  return (
    <WeekView
      start={start}
      today={today}
      currentStart={weekStart(today)}
      sessions={items}
      schedule={(schedule ?? []).map((d) => ({ weekday: d.weekday, dayType: d.day_type }))}
    />
  );
}
