# Methodology notes

## Analytical unit

The product compares a commodity-market-day aggregate. It is intentionally more stable than a
specific lot quotation but less specific than a variety, grade, or negotiated trade. The UI states
this boundary and exposes the number of source varieties behind the latest aggregate.

## Irregular time series

AGMARKNET reports are not a guaranteed daily panel. Calendar reindexing with zero or observed-value
forward fill would blur missingness with market behavior. MandiLens instead uses as-of lags and
time-window features over the reports actually available at each origin.

## Global tree rationale

A single histogram gradient-boosting regressor shares information across markets and commodities,
with categorical codes for series context and robust absolute-error loss. This is a deliberately
boring, portable tree implementation from scikit-learn; it avoids the operating-system OpenMP
dependency of LightGBM while preserving the required tree-model comparison.

## Selection discipline

The model is not selected because it is machine learning. It must achieve at least a 1% MAE
reduction versus the strongest baseline across pooled future-only predictions. The current 1.12%
gain clears that line narrowly. Future refreshes can legitimately switch back to a baseline if the
tree stops clearing the same rule.

## Feature importance

Permutation importance is calculated only when the tree is selected. It measures the increase in
absolute error after shuffling a feature in a held-out-sized tail sample. It describes model
reliance, not a causal relationship or policy lever.

## Prediction intervals

The intervals are symmetric absolute-error quantile ranges around point forecasts, clipped to a
positive lower price. They are not Gaussian confidence intervals and do not assume normally
distributed errors. Their historical coverage is measured explicitly on later chronological folds.

## Directional accuracy

Direction compares the sign of predicted change from the origin with the sign of observed change.
The last-observation baseline predicts no change; its low directional score is therefore compatible
with competitive absolute error.

## Net realization

The market ranking is deterministic arithmetic applied after inference. It uses only the forecast,
quantity conversion, and user-entered market cost. The low and high forecast values propagate into
low and high net estimates so uncertainty remains visible at the decision layer.
