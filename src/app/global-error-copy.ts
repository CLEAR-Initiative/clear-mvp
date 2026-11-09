import type { Locale } from "~/i18n/config";

/**
 * global-error.tsx replaces the root layout, so it renders without the
 * next-intl provider, and importing a whole message catalog (160-215 KB each)
 * into it isn't worth it. These strings mirror `errorBoundary` in
 * messages/*.json. global-error-copy.test.ts fails if they drift, so edit the
 * catalogs first and copy the change here.
 */
export type GlobalErrorCopy = {
  title: string;
  message: string;
  updatedTitle: string;
  updatedMessage: string;
  reload: string;
};

export const globalErrorCopy: Record<Locale, GlobalErrorCopy> = {
  en: {
    title: "Something went wrong",
    message:
      "This page hit an error. Reloading usually fixes it. If it keeps happening, tell the CLEAR team.",
    updatedTitle: "CLEAR has been updated",
    updatedMessage:
      "A new version was released while this page was open. Reload to continue.",
    reload: "Reload page",
  },
  fr: {
    title: "Une erreur est survenue",
    message:
      "Cette page a rencontré une erreur. Un rechargement suffit généralement. Si le problème persiste, prévenez l'équipe CLEAR.",
    updatedTitle: "CLEAR a été mis à jour",
    updatedMessage:
      "Une nouvelle version a été publiée pendant que cette page était ouverte. Rechargez pour continuer.",
    reload: "Recharger la page",
  },
  es: {
    title: "Algo salió mal",
    message:
      "Esta página encontró un error. Recargar suele solucionarlo. Si sigue ocurriendo, avisa al equipo de CLEAR.",
    updatedTitle: "CLEAR se ha actualizado",
    updatedMessage:
      "Se publicó una nueva versión mientras esta página estaba abierta. Recarga para continuar.",
    reload: "Recargar página",
  },
  ar: {
    title: "حدث خطأ ما",
    message:
      "واجهت هذه الصفحة خطأً. عادةً ما تحل إعادة التحميل المشكلة. إذا تكرر ذلك، فأبلغ فريق CLEAR.",
    updatedTitle: "تم تحديث CLEAR",
    updatedMessage: "تم إصدار نسخة جديدة أثناء فتح هذه الصفحة. أعد التحميل للمتابعة.",
    reload: "إعادة تحميل الصفحة",
  },
};
