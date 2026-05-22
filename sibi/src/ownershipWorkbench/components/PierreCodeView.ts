import { CodeView as PierreReactCodeView } from "@pierre/diffs/react";
import type { CodeViewProps } from "@pierre/diffs/react";

export type PierreCodeViewProps<LAnnotation = undefined> = CodeViewProps<LAnnotation>;
export const PierreCodeView: typeof PierreReactCodeView = PierreReactCodeView;
