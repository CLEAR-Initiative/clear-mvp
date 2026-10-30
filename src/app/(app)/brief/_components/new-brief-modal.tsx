"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Group, Modal, Select, Stack, Text } from "@mantine/core";
import { RegionPicker } from "~/components/ui";
import { useLocations } from "~/hooks/use-locations";
import { api } from "~/trpc/react";
import type { BriefCadence } from "~/lib/brief/types";

/**
 * Start a Brief: its cadence is fixed by the button that opened this, and the
 * area is a country with an optional state or district. clear-api sets the
 * window (ending now) and the default title, and refuses anything below a
 * district.
 */
export function NewBriefModal({ cadence, onClose }: { cadence: BriefCadence | null; onClose: () => void }) {
  const t = useTranslations("brief");
  const router = useRouter();
  const { tree, isLoading } = useLocations();
  const [countryId, setCountryId] = useState<string | null>(null);
  const [regionId, setRegionId] = useState<string | null>(null);
  const create = api.briefs.create.useMutation({
    onSuccess: (brief) => router.push(`/brief/${brief.id}`),
  });

  const country = tree.find((c) => c.id === countryId);
  const close = () => {
    create.reset();
    setCountryId(null);
    setRegionId(null);
    onClose();
  };

  return (
    <Modal
      opened={cadence !== null}
      onClose={close}
      title={cadence ? t(`new.title.${cadence}`) : ""}
      centered
    >
      <Stack gap={12}>
        <Text size="sm" c="var(--color-text-secondary)">
          {cadence ? t(`new.window.${cadence}`) : ""}
        </Text>
        <Select
          label={t("new.country")}
          placeholder={t("new.countryPlaceholder")}
          data={tree.map((c) => ({ value: c.id, label: c.name }))}
          value={countryId}
          onChange={(v) => {
            setCountryId(v);
            setRegionId(null);
          }}
          searchable
          disabled={isLoading}
          data-testid="brief-new-country"
        />
        {country && country.states.length > 0 && (
          <RegionPicker states={country.states} value={regionId} onChange={setRegionId} label={t("new.region")} />
        )}
        {create.error && (
          <Text size="sm" c="var(--color-critical)">
            {t("new.error", { message: create.error.message })}
          </Text>
        )}
        <Group justify="flex-end" gap={8}>
          <Button variant="default" onClick={close}>
            {t("new.cancel")}
          </Button>
          <Button
            disabled={!cadence || !countryId}
            loading={create.isPending || create.isSuccess}
            onClick={() => cadence && countryId && create.mutate({ cadence, locationId: regionId ?? countryId })}
            data-testid="brief-new-submit"
          >
            {t("new.submit")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
