"use client";

import { useState } from "react";
import { Combobox, InputBase, UnstyledButton, useCombobox } from "@mantine/core";
import { IconCheck, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useMapPlace, type PlaceOption } from "~/containers/map/hooks/use-map-place";
import { GLOBAL_PLACE, placeLocationId, type MapPlace } from "~/containers/map/place/model";
import { GlobeIcon } from "./globe-icon";
import classes from "./place-header.module.css";
import viewClasses from "./panel-views.module.css";
import { useMapSheet, usePeekTitle } from "./sheet-context";

const ALL = "__all";

type Row = { value: string; label: string; checked: boolean };

function normalize(text: string) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function matches(label: string, search: string) {
  return normalize(label).includes(normalize(search.trim()));
}

export function PlaceHeader({ onPlaceChange }: { onPlaceChange: () => void }) {
  const t = useTranslations("mapV2.place");
  const tPanel = useTranslations("mapV2.panel");
  const sheet = useMapSheet();
  const { status, place, countryOptions, stateOptions, setPlace } = useMapPlace();
  const [search, setSearch] = useState("");
  const combobox = useCombobox({
    onDropdownClose: () => {
      combobox.resetSelectedOption();
      setSearch("");
    },
  });

  const pick = (next: MapPlace) => {
    setPlace(next);
    onPlaceChange();
    sheet?.lower();
  };

  const country = place.kind === "global" ? null : place.kind === "country" ? place : place.country;
  const title = country ? country.name : t("global");
  usePeekTitle(title);
  const picking = country ? "region" : "country";
  const options: PlaceOption[] = country ? stateOptions : countryOptions;
  const placeId = placeLocationId(place);
  const showPicker = !country || stateOptions.length > 0 || status === "loading";

  const rows: Row[] = [
    ...(search.trim() === ""
      ? [{ value: ALL, label: t(country ? "allRegions" : "allCountries"), checked: place.kind !== "state" }]
      : []),
    ...options
      .filter((option) => matches(option.name, search))
      .map((option) => ({ value: option.id, label: option.name, checked: option.id === placeId })),
  ];

  const submit = (value: string) => {
    combobox.closeDropdown();
    if (country) {
      if (value === ALL) pick({ kind: "country", id: country.id, name: country.name });
      else {
        const state = stateOptions.find((option) => option.id === value);
        if (state) pick({ kind: "state", id: state.id, name: state.name, country });
      }
    } else if (value === ALL) pick(GLOBAL_PLACE);
    else {
      const next = countryOptions.find((option) => option.id === value);
      if (next) pick({ kind: "country", id: next.id, name: next.name });
    }
  };

  const open = combobox.dropdownOpened;
  const pickedState = place.kind === "state" ? place.name : "";
  const disabled = status !== "ready";

  return (
    <header className={classes.root}>
      <div
        className={sheet ? `${classes.titleRow} ${viewClasses.dragHandle}` : classes.titleRow}
        {...sheet?.dragHandle}
      >
        <h2 className={classes.title}>{title}</h2>
        {country && (
          <UnstyledButton className={classes.chip} onClick={() => pick(GLOBAL_PLACE)}>
            <span>{t("globalView")}</span>
            <GlobeIcon />
          </UnstyledButton>
        )}
        {sheet && (
          <UnstyledButton
            className={`${viewClasses.iconButton} ${classes.close}`}
            onClick={sheet.close}
            aria-label={tPanel("close")}
            title={tPanel("close")}
          >
            <IconX size={20} aria-hidden />
          </UnstyledButton>
        )}
      </div>
      {showPicker && (
        <Combobox
          store={combobox}
          onOptionSubmit={submit}
          position="bottom-start"
          offset={4}
          width="target"
          middlewares={{
            flip: true,
            shift: true,
            size: {
              apply: ({ availableHeight, elements }) =>
                elements.floating.style.setProperty("--place-dropdown-room", `${availableHeight}px`),
            },
          }}
        >
          <Combobox.Target>
            <InputBase
              value={open ? search : pickedState}
              onChange={(event) => {
                combobox.openDropdown();
                combobox.updateSelectedOptionIndex();
                setSearch(event.currentTarget.value);
              }}
              onClick={() => combobox.openDropdown()}
              onFocus={() => combobox.openDropdown()}
              onBlur={() => combobox.closeDropdown()}
              placeholder={t(picking === "region" ? "searchRegion" : "searchCountry")}
              aria-label={t(picking === "region" ? "regionLabel" : "countryLabel")}
              disabled={disabled}
              leftSection={<IconSearch size={16} aria-hidden />}
              rightSection={
                pickedState && !open && !disabled ? (
                  <UnstyledButton
                    className={classes.clear}
                    aria-label={t("clearRegion")}
                    onClick={() => country && pick({ kind: "country", id: country.id, name: country.name })}
                  >
                    <IconX size={16} />
                  </UnstyledButton>
                ) : null
              }
              rightSectionPointerEvents="all"
              classNames={{ root: classes.inputRoot, input: classes.input, section: classes.section }}
              data-picked={pickedState ? true : undefined}
            />
          </Combobox.Target>
          <Combobox.Dropdown className={classes.dropdown}>
            <Combobox.Options className={classes.options}>
              {rows.map((row) => (
                <Combobox.Option key={row.value} value={row.value} active={row.checked} className={classes.option}>
                  {row.checked && <IconCheck size={16} aria-hidden />}
                  {row.label}
                </Combobox.Option>
              ))}
              {rows.length === 0 && <Combobox.Empty className={classes.empty}>{t("noResults")}</Combobox.Empty>}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>
      )}
    </header>
  );
}
