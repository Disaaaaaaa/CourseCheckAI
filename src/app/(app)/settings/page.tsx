import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedTeacher } from "@/lib/auth";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const { teacher } = await getAuthenticatedTeacher();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Баптаулар</h1>
        <p className="text-sm text-muted-foreground">
          Мұғалім профилі және бағдарлама параметрлері.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>
            Бұл мәліметтер есеп беттерінде көрсетіледі.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm teacher={teacher} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Бағдарлама</CardTitle>
          <CardDescription>Жүйе туралы ақпарат.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Версия:</span> MVP 0.1
          </p>
          <p>
            <span className="text-muted-foreground">Рубрика:</span> 40 баллдық
            жүйе (БМ1 10, БМ2 20, БМ3 10)
          </p>
          <p>
            <span className="text-muted-foreground">Пән:</span> Қазақстан
            тарихы, 12-сынып
          </p>
          <p>
            <span className="text-muted-foreground">Соңғы шешім:</span> мұғалімде
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
