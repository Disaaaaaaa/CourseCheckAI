import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TopicsWorkspace } from "./topics-workspace";

export const metadata = {
  title: "Тақырып таңдау · CourseCheck AI",
};

export default function TopicsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Курстық тақырып таңдау
        </h1>
        <p className="text-sm text-muted-foreground">
          Оқушының қызығушылықтарын енгізіңіз — AI оған сай 5–6 нақты курстық
          жұмыс тақырыбын зерттеу сұрақтары, бағалау моделі және дереккөздерімен
          ұсынады.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Оқушының портреті</CardTitle>
          <CardDescription>
            Қызығушылықтары мен дағдыларын мүмкіндігінше нақты жазыңыз.
            Тапсырыс берген сайын тақырыптар жаңартылады.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TopicsWorkspace />
        </CardContent>
      </Card>
    </div>
  );
}
