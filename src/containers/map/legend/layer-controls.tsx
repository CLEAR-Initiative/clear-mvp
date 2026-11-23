"use client";

import { useState } from "react";
import { Popover, Slider, Tooltip, UnstyledButton } from "@mantine/core";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ActiveLayer } from "../hooks/use-active-layers";
import classes from "./legend.module.css";
import { OpacityIcon } from "./opacity-icon";

type LayerControlsProps = {
  layer: ActiveLayer;
  onChange: (patch: Partial<Omit<ActiveLayer, "id">>) => void;
};

export function LayerControls({ layer, onChange }: LayerControlsProps) {
  const t = useTranslations("mapV2.controls");
  const visibilityLabel = layer.visibility ? t("hideLayer") : t("showLayer");

  return (
    <>
      <OpacityControl opacity={layer.opacity} onChange={(opacity) => onChange({ opacity })} />
      <Tooltip label={visibilityLabel} position="top">
        <UnstyledButton
          aria-label={visibilityLabel}
          className={classes.icon}
          onClick={() => onChange({ visibility: !layer.visibility })}
        >
          {layer.visibility ? <IconEye size={16} /> : <IconEyeOff size={16} />}
        </UnstyledButton>
      </Tooltip>
    </>
  );
}

function OpacityControl({ opacity, onChange }: { opacity: number; onChange: (opacity: number) => void }) {
  const t = useTranslations("mapV2.controls");
  const [opened, setOpened] = useState(false);

  return (
    <Popover opened={opened} onChange={setOpened} position="top" offset={6} withArrow arrowSize={8} shadow="sm" radius={8} classNames={{ arrow: classes.opacityArrow }}>
      <Popover.Target>
        <Tooltip label={t("opacity")} position="top" disabled={opened}>
          <UnstyledButton
            aria-label={t("opacity")}
            className={classes.icon}
            onClick={() => setOpened((value) => !value)}
            onKeyDown={(event) => {
              if (!opened || event.key !== "Escape") return;
              event.stopPropagation();
              setOpened(false);
            }}
          >
            <OpacityIcon />
          </UnstyledButton>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown
        className={classes.opacityDropdown}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.stopPropagation();
        }}
      >
        <OpacitySlider initial={opacity} onChangeEnd={onChange} />
      </Popover.Dropdown>
    </Popover>
  );
}

function OpacitySlider({ initial, onChangeEnd }: { initial: number; onChangeEnd: (opacity: number) => void }) {
  const t = useTranslations("mapV2.controls");
  const format = useFormatter();
  const [percent, setPercent] = useState(Math.round(initial * 100));

  return (
    <div className={classes.opacity}>
      <span>{t("opacity")}</span>
      <Slider
        thumbLabel={t("opacity")}
        min={0}
        max={100}
        step={1}
        label={null}
        size={1}
        thumbSize={16}
        classNames={{ track: classes.sliderTrack, bar: classes.sliderBar, thumb: classes.sliderThumb }}
        value={percent}
        onChange={setPercent}
        onChangeEnd={(value) => onChangeEnd(value / 100)}
      />
      <div className={classes.sliderEnds}>
        <span>{format.number(0, { style: "percent" })}</span>
        <span>{format.number(1, { style: "percent" })}</span>
      </div>
    </div>
  );
}
