"use client";

import { Combobox, UnstyledButton, useCombobox } from "@mantine/core";
import { IconCheck, IconChevronDown, IconFilter, IconX } from "@tabler/icons-react";
import { sentenceCase } from "~/containers/map/filters/model";
import classes from "./filter-select.module.css";
import dropdownClasses from "./panel-dropdown.module.css";
import { panelDropdownProps } from "./panel-dropdown";

export type FilterGroup = { label: string | null; options: string[] };

type FilterSelectProps = {
  placeholder: string;
  clearLabel: string;
  emptyLabel: string;
  value: string | null;
  groups: FilterGroup[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  describedBy?: string;
};

export function FilterSelect({
  placeholder,
  clearLabel,
  emptyLabel,
  value,
  groups,
  onChange,
  disabled = false,
  describedBy,
}: FilterSelectProps) {
  const combobox = useCombobox({ onDropdownClose: () => combobox.resetSelectedOption() });
  const open = combobox.dropdownOpened;

  const submit = (next: string) => {
    combobox.closeDropdown();
    onChange(next);
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={submit}
      {...panelDropdownProps}
    >
      <Combobox.DropdownTarget>
        <div
          className={classes.field}
          data-selected={value ? true : undefined}
          data-disabled={disabled || undefined}
          data-expanded={open || undefined}
          onClick={() => {
            if (!disabled) combobox.toggleDropdown();
          }}
        >
          <IconFilter size={20} stroke={1.5} aria-hidden className={classes.icon} />
          {value ? (
            <span className={classes.pill}>
              <Combobox.EventsTarget targetType="button">
                <UnstyledButton className={classes.pillLabel} disabled={disabled} aria-describedby={describedBy}>
                  {sentenceCase(value)}
                </UnstyledButton>
              </Combobox.EventsTarget>
              <UnstyledButton
                className={classes.pillClear}
                aria-label={clearLabel}
                disabled={disabled}
                onClick={(event) => {
                  event.stopPropagation();
                  combobox.closeDropdown();
                  onChange(null);
                }}
              >
                <IconX size={16} aria-hidden />
              </UnstyledButton>
            </span>
          ) : (
            <Combobox.EventsTarget targetType="button">
              <UnstyledButton className={classes.target} disabled={disabled} aria-describedby={describedBy}>
                {placeholder}
              </UnstyledButton>
            </Combobox.EventsTarget>
          )}
          <IconChevronDown size={16} aria-hidden className={classes.chevron} />
        </div>
      </Combobox.DropdownTarget>
      <Combobox.Dropdown className={dropdownClasses.dropdown}>
        <Combobox.Options className={dropdownClasses.options}>
          {groups.map((group) => {
            const options = group.options.map((option) => (
              <Combobox.Option key={option} value={option} active={option === value} className={dropdownClasses.option}>
                {option === value && <IconCheck size={16} aria-hidden />}
                {sentenceCase(option)}
              </Combobox.Option>
            ));
            return group.label === null ? (
              options
            ) : (
              <Combobox.Group key={group.label} label={group.label} classNames={{ groupLabel: classes.groupLabel }}>
                {options}
              </Combobox.Group>
            );
          })}
          {groups.every((group) => group.options.length === 0) && (
            <Combobox.Empty className={dropdownClasses.empty}>{emptyLabel}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
}
